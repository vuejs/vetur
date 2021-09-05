import { Position, Range } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { prettierPluginPugify } from '../../utils/prettier';
import { VLSFormatConfig } from '../../config';
import { getFileFsPath } from '../../utils/paths';
import { DependencyService } from '../../services/dependencyService';
import { EnvironmentService } from '../../services/EnvironmentService';
import { findTokenAtPosition } from './languageService';
import { getLanguageModelCache, LanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { VueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { VueInfoService } from '../../services/vueInfoService';
import { getTagDefinition } from '../template-common/tagDefinition';

export function getPugMode(
  env: EnvironmentService,
  dependencyService: DependencyService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  vueInfoService?: VueInfoService
): LanguageMode {
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document =>
    documentRegions.refreshAndGet(document).getSingleLanguageDocument('pug')
  );

  return {
    getId: () => 'pug',
    format(document, currRange, formattingOptions) {
      if (env.getConfig().vetur.format.defaultFormatter['pug'] === 'none') {
        return [];
      }

      const { value, range } = getValueAndRange(document, currRange);

      return prettierPluginPugify(
        dependencyService,
        value,
        getFileFsPath(document.uri),
        'pug',
        range,
        env.getConfig().vetur.format as VLSFormatConfig,
        false
      );
    },
    findDefinition(document, position) {
      const embedded = embeddedDocuments.refreshAndGet(document);

      const token = findTokenAtPosition(embedded.getText(), position);
      if (!token || token.type !== 'tag') {
        return [];
      }

      const info = vueInfoService?.getInfo(document);
      if (!info) {
        return [];
      }

      return getTagDefinition(info, token.val);
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string; range: Range } {
  let value = document.getText();
  let range = currRange;

  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}
