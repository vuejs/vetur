import { CompletionItem, Diagnostic, Position, Range } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  LanguageService
} from 'vscode-css-languageservice';
import _ from 'lodash';
import * as emmet from 'vscode-emmet-helper';

import { Priority } from './emmet';
import { LanguageModelCache, getLanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { VueDocumentRegions, LanguageId } from '../../embeddedSupport/embeddedSupport';
import { getFileFsPath } from '../../utils/paths';
import { prettierify } from '../../utils/prettier';
import { NULL_HOVER } from '../nullMode';
import { VLSFormatConfig } from '../../config';
import { DependencyService } from '../../services/dependencyService';
import { BuiltInParserName } from 'prettier';
import { EnvironmentService } from '../../services/EnvironmentService';

export function getCSSMode(
  env: EnvironmentService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode(env, 'css', languageService, documentRegions, dependencyService);
}

export function getPostCSSMode(
  env: EnvironmentService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode(env, 'postcss', languageService, documentRegions, dependencyService);
}

export function getSCSSMode(
  env: EnvironmentService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode(env, 'scss', languageService, documentRegions, dependencyService);
}

export function getLESSMode(
  env: EnvironmentService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode(env, 'less', languageService, documentRegions, dependencyService);
}

function getStyleMode(
  env: EnvironmentService,
  languageId: LanguageId,
  languageService: LanguageService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document =>
    documentRegions.refreshAndGet(document).getSingleLanguageDocument(languageId)
  );
  const stylesheets = getLanguageModelCache(10, 60, document => languageService.parseStylesheet(document));

  let latestConfig = env.getConfig().css;
  function syncConfig() {
    if (_.isEqual(latestConfig, env.getConfig().css)) {
      return;
    }
    latestConfig = env.getConfig().css;
    languageService.configure(env.getConfig().css);
  }

  return {
    getId() {
      return languageId;
    },
    async doValidation(document) {
      syncConfig();
      if (languageId === 'postcss') {
        return [];
      } else {
        const embedded = embeddedDocuments.refreshAndGet(document);
        return languageService.doValidation(embedded, stylesheets.refreshAndGet(embedded)) as Diagnostic[];
      }
    },
    doComplete(document, position) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      const emmetSyntax = languageId === 'postcss' ? 'css' : languageId;
      const lsCompletions = languageService.doComplete(embedded, position, stylesheets.refreshAndGet(embedded));
      const lsItems = lsCompletions
        ? _.map(lsCompletions.items, i => {
            return {
              ...i,
              sortText: Priority.Platform + i.label
            } as CompletionItem;
          })
        : [];

      const emmetCompletions = emmet.doComplete(document, position, emmetSyntax, env.getConfig().emmet);
      if (!emmetCompletions) {
        return { isIncomplete: false, items: lsItems };
      } else {
        const emmetItems = emmetCompletions.items.map(i => {
          return {
            ...i,
            sortText: Priority.Emmet + i.label
          } as CompletionItem;
        });
        return {
          isIncomplete: emmetCompletions.isIncomplete,
          items: _.concat(emmetItems, lsItems)
        };
      }
    },
    doHover(document, position) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.doHover(embedded, position, stylesheets.refreshAndGet(embedded)) || NULL_HOVER;
    },
    findDocumentHighlight(document, position) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.findDocumentHighlights(embedded, position, stylesheets.refreshAndGet(embedded));
    },
    findDocumentSymbols(document) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.findDocumentSymbols(embedded, stylesheets.refreshAndGet(embedded));
    },
    findDefinition(document, position) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      const definition = languageService.findDefinition(embedded, position, stylesheets.refreshAndGet(embedded));
      if (!definition) {
        return [];
      }
      return definition;
    },
    findReferences(document, position) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.findReferences(embedded, position, stylesheets.refreshAndGet(embedded));
    },
    findDocumentColors(document) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.findDocumentColors(embedded, stylesheets.refreshAndGet(embedded));
    },
    getFoldingRanges(document) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.getFoldingRanges(embedded);
    },
    getColorPresentations(document, color, range) {
      syncConfig();
      const embedded = embeddedDocuments.refreshAndGet(document);
      return languageService.getColorPresentations(embedded, stylesheets.refreshAndGet(embedded), color, range);
    },
    format(document, currRange, formattingOptions) {
      if (env.getConfig().vetur.format.defaultFormatter[languageId] === 'none') {
        return [];
      }
      syncConfig();

      const { value, range } = getValueAndRange(document, currRange);
      const needIndent = env.getConfig().vetur.format.styleInitialIndent;

      return prettierify(
        dependencyService,
        value,
        getFileFsPath(document.uri),
        languageId,
        range,
        env.getConfig().vetur.format as VLSFormatConfig,
        needIndent
      );
    },
    onDocumentRemoved(document) {
      embeddedDocuments.onDocumentRemoved(document);
      stylesheets.onDocumentRemoved(document);
    },
    dispose() {
      embeddedDocuments.dispose();
      stylesheets.dispose();
    }
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
