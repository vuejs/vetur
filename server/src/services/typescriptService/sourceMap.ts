import { TextDocument, Range } from 'vscode-languageserver-types';
import { TemplateSourceMap } from './serviceHost';
import { getFileFsPath } from '../../utils/paths';
import * as ts from 'typescript';

/**
 * Map a range from actual .vue file to .vue.template file
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
  const sourceMap = sourceMaps[filePath];
  if (!sourceMap) {
    // Todo: Remove this when all source map can be generated from templates
    return Range.create(0, 0, 0, 0);
  }

  for (const sourceNode of sourceMap) {
    if (to.start >= sourceNode.to.start && to.start + to.length <= sourceNode.to.end) {
      const start = sourceNode.from.start + (to.start - sourceNode.to.start);
      const end = sourceNode.from.end + (to.start + to.length - sourceNode.to.end);
      return {
        start: document.positionAt(start),
        end: document.positionAt(end)
      };
    }
  }

  // Handle the case when no original range can be mapped
  return Range.create(0, 0, 0, 0);
}
