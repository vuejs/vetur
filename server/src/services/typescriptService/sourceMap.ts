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
}

interface Mapping {
  [k: number]: number;
}

const INVALID_OFFSET = 0;
const INVALID_RANGE = Range.create(0, 0, 0, 0);

/**
 * Invariants:
 *
 * - `from.end - from.start` should equal to `to.end - to.start - 5 * (to.thisDotRanges.length)`
 * - Each item in `to.thisDotRanges` should have length 5 for `this.`
 */
export interface TemplateSourceMapNode {
  from: TemplateSourceMapNodeFrom;
  to: TemplateSourceMapNodeTo;
  offsetMapping: Mapping;
  offsetBackMapping: Mapping;
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
 *   offsetMapping: {
 *     0: 5,
 *     1: 6,
 *     2, 7
 *   },
 * }
 */
export function generateSourceMap(
  tsModule: T_TypeScript,
  syntheticSourceFile: ts.SourceFile,
  validSourceFile: ts.SourceFile
): TemplateSourceMapNode[] {
  const walkASTTree = getAstWalker(tsModule);

  const sourceMapNodes: TemplateSourceMapNode[] = [];
  walkBothNode(syntheticSourceFile, validSourceFile);
  return sourceMapNodes;

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
            fileName: validSourceFile.fileName
          },
          offsetMapping: {},
          offsetBackMapping: {}
        };

        const thisDotRanges: TemplateSourceMapRange[] = [];
        walkASTTree(vc, n => {
          if (tsModule.isPropertyAccessExpression(n.parent) && n.kind === tsModule.SyntaxKind.ThisKeyword) {
            thisDotRanges.push({
              start: n.getStart(),
              end: n.getEnd() + `.`.length
            });
          }
        });

        updateOffsetMapping(sourceMapNode, thisDotRanges);

        sourceMapNodes.push(sourceMapNode);
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
  if (!sourceMap[filePath]) {
    return INVALID_OFFSET;
  }

  for (const sourceMapNode of sourceMap[filePath]) {
    if (offset >= sourceMapNode.from.start && offset <= sourceMapNode.from.end) {
      return sourceMapNode.offsetMapping[offset];
    }
  }

  // Handle the case when no original range can be mapped
  return INVALID_OFFSET;
}

/**
 * Map a range from actual `.vue` file to `.vue.template` file
 */
export function mapToRange(toDocument: TextDocument, from: ts.TextSpan, sourceMap: TemplateSourceMap): Range {
  const filePath = getFileFsPath(toDocument.uri);
  if (!sourceMap[filePath]) {
    return INVALID_RANGE;
  }

  for (const sourceMapNode of sourceMap[filePath]) {
    if (from.start >= sourceMapNode.from.start && from.start + from.length <= sourceMapNode.from.end) {
      const mappedStart = sourceMapNode.offsetMapping[from.start];
      const mappedEnd = sourceMapNode.offsetMapping[from.start + from.length];
      return {
        start: toDocument.positionAt(mappedStart),
        end: toDocument.positionAt(mappedEnd)
      };
    }
  }

  // Handle the case when no original range can be mapped
  return INVALID_RANGE;
}

/**
 * Map a range from virtual `.vue.template` file back to original `.vue` file
 */
export function mapBackRange(fromDocumnet: TextDocument, to: ts.TextSpan, sourceMap: TemplateSourceMap): Range {
  const filePath = getFileFsPath(fromDocumnet.uri);
  if (!sourceMap[filePath]) {
    return INVALID_RANGE;
  }

  for (const sourceMapNode of sourceMap[filePath]) {
    if (to.start >= sourceMapNode.to.start && to.start + to.length <= sourceMapNode.to.end) {
      const mappedStart = sourceMapNode.offsetBackMapping[to.start];
      const mappedEnd = sourceMapNode.offsetBackMapping[to.start + to.length];

      return {
        start: fromDocumnet.positionAt(mappedStart),
        end: fromDocumnet.positionAt(mappedEnd)
      };
    }
  }

  // Handle the case when no original range can be mapped
  return INVALID_RANGE;
}

function updateOffsetMapping(node: TemplateSourceMapNode, thisDotRanges: TemplateSourceMapRange[]) {
  const from = [...Array(node.from.end - node.from.start + 1).keys()];
  const to: (number | undefined)[] = [...Array(node.to.end - node.to.start + 1).keys()];

  thisDotRanges.forEach(tdr => {
    for (let i = tdr.start; i < tdr.end; i++) {
      to[i - node.to.start] = undefined;
    }
  });

  const toFiltered = to.filter(x => x !== undefined) as number[];

  from.forEach((offset, i) => {
    const from = offset + node.from.start;
    const to = toFiltered[i] + node.to.start;
    node.offsetMapping[from] = to;
    node.offsetBackMapping[to] = from;
  });

  /**
   * The case such as `foo` mapped to `this.foo`
   * Both `|this.foo` and `this.|foo` should map to `|foo`
   * Without this back mapping, mapping error from `this.bar` in `f(this.bar)` would fail
   */
  thisDotRanges.forEach(tdr => {
    node.offsetBackMapping[tdr.start] = node.offsetBackMapping[tdr.end];
  });
}

export function printSourceMap(sourceMap: TemplateSourceMap, vueFileSrc: string, tsFileSrc: string) {
  for (const fileName in sourceMap) {
    console.log(`Sourcemap for ${fileName}`);

    sourceMap[fileName].forEach(node => {
      const sf = vueFileSrc.slice(node.from.start, node.from.end);
      const st = vueFileSrc.slice(node.to.start, node.to.end);
      console.log(`[${node.from.start}, ${node.from.end}, ${sf}] => [${node.to.start}, ${node.to.end}, ${st}]`);
    });
    // console.log(JSON.stringify(sourceMap[fileName].offsetMapping));
  }
}

export function stringifySourceMapNodes(
  sourceMapNodes: TemplateSourceMapNode[],
  vueFileSrc: string,
  tsFileSrc: string
): string {
  let result = '';

  sourceMapNodes.forEach(node => {
    const sf = vueFileSrc.slice(node.from.start, node.from.end);
    const st = tsFileSrc.slice(node.to.start, node.to.end);
    result += `[${node.from.start}, ${node.from.end}, ${sf}] => [${node.to.start}, ${node.to.end}, ${st}]\n`;
  });

  return result;
}
