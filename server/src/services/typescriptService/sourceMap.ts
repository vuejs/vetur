import { TextDocument, Range, Position } from 'vscode-languageserver-types';
import { getFileFsPath } from '../../utils/paths';
import * as ts from 'typescript';

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
