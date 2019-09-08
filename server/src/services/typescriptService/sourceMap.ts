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
  mergedNodes: TemplateSourceMapNode[];
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
  const sourceMapNodes: TemplateSourceMapNode[] = [];
  walkBothNode(syntheticSourceFile, validSourceFile);
  return foldSourceMapNodes(sourceMapNodes);

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
          offsetBackMapping: {},
          mergedNodes: []
        };

        const isThisInjected =
          tsModule.isPropertyAccessExpression(vc) && vc.expression.kind === tsModule.SyntaxKind.ThisKeyword;
        updateOffsetMapping(sourceMapNode, isThisInjected, !canIncludeTrivia(tsModule, vc));

        sourceMapNodes.push(sourceMapNode);
      }

      walkBothNode(sc, vc);
    });
  }
}

/**
 * Merge source map nodes when a node overwraps another node.
 * For example, the following expression will generates three source map nodes,
 * for `foo` identifier, `bar` identifier and entire binary expression `foo + bar`.
 *
 * `foo + bar`
 *
 * In this case `foo + bar` contains `foo` and `bar`. Then we will merge source map nodes
 * for the identifiers into the map for `foo + bar`.
 */
function foldSourceMapNodes(nodes: TemplateSourceMapNode[]): TemplateSourceMapNode[] {
  return nodes.reduce<TemplateSourceMapNode[]>((folded, node) => {
    const last = folded[folded.length - 1];
    if (!last) {
      return folded.concat(node);
    }

    // Children source map nodes always appear after a parent node
    // because of how we traverse source mapping in `walkBothNode` function.
    if (node.from.start < last.from.start || last.from.end < node.from.end) {
      return folded.concat(node);
    }

    last.offsetMapping = {
      ...last.offsetMapping,
      ...node.offsetMapping
    };

    last.offsetBackMapping = {
      ...last.offsetBackMapping,
      ...node.offsetBackMapping
    };

    last.mergedNodes.push(node);

    return folded;
  }, []);
}

function canIncludeTrivia(tsModule: T_TypeScript, node: ts.Node): boolean {
  return !(
    tsModule.isIdentifier(node) ||
    tsModule.isStringLiteral(node) ||
    tsModule.isNumericLiteral(node) ||
    tsModule.isBigIntLiteral(node)
  );
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

function updateOffsetMapping(node: TemplateSourceMapNode, isThisInjected: boolean, fillIntermediate: boolean) {
  const from = [...Array(node.from.end - node.from.start + 1).keys()];
  const to: (number | undefined)[] = [...Array(node.to.end - node.to.start + 1).keys()];

  if (isThisInjected) {
    for (let i = 0; i < 'this.'.length; i++) {
      to[node.to.start + i] = undefined;
    }

    /**
     * The case such as `foo` mapped to `this.foo`
     * Both `|this.foo` and `this.|foo` should map to `|foo`
     * Without this back mapping, mapping error from `this.bar` in `f(this.bar)` would fail
     */
    node.offsetBackMapping[node.to.start] = node.from.start + 'this.'.length;
  }

  const toFiltered = to.filter(x => x !== undefined) as number[];

  const mapping = fillIntermediate
    ? from.map((from, i) => [from, toFiltered[i]])
    : [[from[0], toFiltered[0]], [from[from.length - 1], toFiltered[toFiltered.length - 1]]];

  mapping.forEach(([fromOffset, toOffset]) => {
    const from = fromOffset + node.from.start;
    const to = toOffset + node.to.start;
    node.offsetMapping[from] = to;
    node.offsetBackMapping[to] = from;
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
