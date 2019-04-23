import { TextDocument, Range, Position } from 'vscode-languageserver-types';
import { getFileFsPath } from '../../utils/paths';
import * as ts from 'typescript';
import { T_TypeScript } from '../dependencyService';

interface TemplateSourceMapRange {
  start: number;
  end: number;
}

interface TemplateSourceMapNodeFrom extends TemplateSourceMapRange {
  fileName: string;
}
interface TemplateSourceMapNodeTo extends TemplateSourceMapRange {
  fileName: string;
  thisDotRanges: TemplateSourceMapRange[];
}

/**
 * Invariants:
 *
 * - `from.end - from.start` should equal to `to.end - to.start - 5 * (to.thisDotRanges.length)`
 * - Each item in `to.thisDotRanges` should have length 5 for `this.`
 *
 * - Todo: Handle travia, for example foo + this.bar
 */
export interface TemplateSourceMapNode {
  from: TemplateSourceMapNodeFrom;
  to: TemplateSourceMapNodeTo;
}

export interface TemplateSourceMap {
  [fileName: string]: TemplateSourceMapNode[];
}

/**
 * Walk through the validSourceFile, for each Node, find its corresponding Node in syntheticSourceFile.
 *
 * Generate a SourceMap with Nodes looking like this:
 *
 * SourceMapNode {
 *   from: {
 *     start: 0,
 *     end: 8
 *     filename: 'foo.vue'
 *   },
 *   to: {
 *     start: 0,
 *     end: 18
 *     filename: 'foo.vue.template'
 *   },
 *   offsetMappings: {
 *     0: 5,
 *     1: 6,
 *     2, 7
 *   },
 * }
 */
export function generateSourceMap(
  tsModule: T_TypeScript,
  syntheticSourceFile: ts.SourceFile,
  validSourceFile: ts.SourceFile,
  templateCode: string
): TemplateSourceMap {
  const walkASTTree = getAstWalker(tsModule);

  const sourceMap: TemplateSourceMap = {};
  sourceMap[syntheticSourceFile.fileName] = [];
  sourceMap[validSourceFile.fileName] = [];

  walkBothNode(syntheticSourceFile, validSourceFile);
  return sourceMap;

  function walkBothNode(syntheticNode: ts.Node, validNode: ts.Node) {
    const validNodeChildren: ts.Node[] = [];
    tsModule.forEachChild(validNode, c => {
      validNodeChildren.push(c);
      return false;
    });
    const syntheticNodeChildren: ts.Node[] = [];
    tsModule.forEachChild(syntheticNode, c => {
      syntheticNodeChildren.push(c);
      return false;
    });

    if (validNodeChildren.length !== syntheticNodeChildren.length) {
      return;
    }

    validNodeChildren.forEach((vc, i) => {
      const sc = syntheticNodeChildren[i];

      const scSourceRange = tsModule.getSourceMapRange(sc);

      /**
       * Multiline object literal lose their original position during transformation, so
       * {
       *   foo: bar
       * }
       * becomes
       * { foo: this.bar }
       *
       * This replaces the transformed expression with original expression so sourcemap would work
       */
      // Todo: Need to handle Object Literal change of positions
      // if (tsModule.isObjectLiteralExpression(sc) && scSourceRange.pos !== -1 && scSourceRange.end !== -1) {
      //   const unmodifiedObjectLiteralExpression = templateCode.slice(scSourceRange.pos, scSourceRange.end);
      //   validSourceFile.update(unmodifiedObjectLiteralExpression, {
      //   // tsModule.updateSourceFile(validSourceFile, unmodifiedObjectLiteralExpression, {
      //     span: { start: vc.getStart(), length: vc.getFullWidth() },
      //     newLength: unmodifiedObjectLiteralExpression.length
      //   });
      // }

      /**
       * `getSourceMapRange` falls back to return actual Node if sourceMap doesn't exist
       * This check ensure we are checking the actual `sourceMapRange` being set
       */
      if (!(scSourceRange as ts.Node).kind && scSourceRange.pos !== -1 && scSourceRange.end !== -1) {
        const sourceMapNode: TemplateSourceMapNode = {
          from: {
            start: scSourceRange.pos,
            end: scSourceRange.end,
            fileName: syntheticSourceFile.fileName
          },
          to: {
            start: vc.getStart(),
            end: vc.getEnd(),
            fileName: validSourceFile.fileName,
            thisDotRanges: []
          }
        };

        walkASTTree(vc, n => {
          if (tsModule.isPropertyAccessExpression(n.parent) && n.kind === tsModule.SyntaxKind.ThisKeyword) {
            sourceMapNode.to.thisDotRanges.push({
              start: n.getStart(),
              end: n.getEnd() + `.`.length
            });
          }
        });

        sourceMap[syntheticSourceFile.fileName].push(sourceMapNode);
        sourceMap[validSourceFile.fileName].push(sourceMapNode);
      }

      walkBothNode(sc, vc);
    });
  }
}

export function getAstWalker(tsModule: T_TypeScript) {
  return function walkASTTree(node: ts.Node, f: (n: ts.Node) => any) {
    f(node);

    tsModule.forEachChild(node, c => {
      walkASTTree(c, f);
      return false;
    });
  };
}

/**
 * Map a range from actual `.vue` file to `.vue.template` file
 */
export function mapFromPositionToOffset(
  document: TextDocument,
  position: Position,
  sourceMap: TemplateSourceMap
): number {
  const offset = document.offsetAt(position);

  return mapFromOffsetToOffset(document, offset, sourceMap);
}

/**
 * Map an offset from actual `.vue` file to `.vue.template` file
 */
function mapFromOffsetToOffset(document: TextDocument, offset: number, sourceMap: TemplateSourceMap): number {
  const filePath = getFileFsPath(document.uri);

  for (const sourceNode of sourceMap[filePath]) {
    if (offset >= sourceNode.from.start && offset <= sourceNode.from.end) {
      const fromOffset = sourceNode.to.start + (offset - sourceNode.from.start);
      return handleThisDotRegions(fromOffset, sourceNode.to);
    }
  }

  // Handle the case when no original range can be mapped
  return 0;
}

/**
 * Map a range from actual `.vue` file to `.vue.template` file
 */
export function mapToRange(document: TextDocument, from: ts.TextSpan, sourceMap: TemplateSourceMap): Range {
  const filePath = getFileFsPath(document.uri);
  for (const sourceNode of sourceMap[filePath]) {
    if (from.start >= sourceNode.from.start && from.start + from.length <= sourceNode.from.end) {
      const start = sourceNode.to.start + (from.start - sourceNode.from.start);
      const end = sourceNode.to.end + (from.start + from.length - sourceNode.from.end);
      return {
        start: document.positionAt(start),
        end: document.positionAt(end)
      };
    }
  }

  // Handle the case when no original range can be mapped
  return Range.create(0, 0, 0, 0);
}

/**
 * Map a range from virtual `.vue.template` file back to original `.vue` file
 */
export function mapBackRange(document: TextDocument, to: ts.TextSpan, sourceMaps: TemplateSourceMap): Range {
  const filePath = getFileFsPath(document.uri);

  for (const sourceNode of sourceMaps[filePath]) {
    if (to.start >= sourceNode.to.start && to.start + to.length <= sourceNode.to.end) {
      const startOffset = to.start - sourceNode.to.start;
      const endOffset = to.start + to.length - sourceNode.to.start;

      const start = sourceNode.from.start + handleBackThisDotRegions(startOffset, sourceNode.to);
      const end = sourceNode.from.start + handleBackThisDotRegions(endOffset, sourceNode.to);

      return {
        start: document.positionAt(start),
        end: document.positionAt(end)
      };
    }
  }

  // Handle the case when no original range can be mapped
  return Range.create(0, 0, 0, 0);
}

function handleThisDotRegions(fromOffset: number, to: TemplateSourceMapNodeTo) {
  let actualOffset = fromOffset;

  for (const tdr of to.thisDotRanges) {
    if (actualOffset < tdr.start - to.start) {
      return actualOffset;
    } else {
      actualOffset += tdr.end - tdr.start;
    }
  }

  return actualOffset;
}

function handleBackThisDotRegions(toOffset: number, to: TemplateSourceMapNodeTo) {
  let actualOffset = toOffset;
  let accumulatedThisDotLength = 0;

  for (const tdr of to.thisDotRanges) {
    if (actualOffset + accumulatedThisDotLength >= tdr.end - to.start) {
      actualOffset -= tdr.end - tdr.start;
      accumulatedThisDotLength += tdr.end - tdr.start;
    } else {
      return actualOffset;
    }
  }

  return actualOffset;
}
