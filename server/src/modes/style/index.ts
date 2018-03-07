import { TextDocument, Position, Range } from 'vscode-languageserver-types';
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  LanguageService
} from 'vscode-css-languageservice';
import * as _ from 'lodash';
import * as emmet from 'vscode-emmet-helper';

import { Priority } from './emmet';
import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';
import { getFileFsPath } from '../../utils/paths';
import { prettierify } from '../../utils/prettier';
import { ParserOption } from '../../utils/prettier/prettier.d';
import { NULL_HOVER } from '../nullMode';

export function getCSSMode(documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('css', languageService, documentRegions);
}

export function getPostCSSMode(documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('postcss', languageService, documentRegions);
}

export function getSCSSMode(documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode('scss', languageService, documentRegions);
}
export function getLESSMode(documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode('less', languageService, documentRegions);
}

function getStyleMode(
  languageId: string,
  languageService: LanguageService,
  documentRegions: LanguageModelCache<VueDocumentRegions>
): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document =>
    documentRegions.get(document).getEmbeddedDocument(languageId)
  );
  const stylesheets = getLanguageModelCache(10, 60, document => languageService.parseStylesheet(document));
  let config: any = {};

  return {
    getId() {
      return languageId;
    },
    configure(c) {
      languageService.configure(c && c.css);
      config = c;
    },
    doValidation(document) {
      if (languageId === 'postcss') {
        return [];
      } else {
        const embedded = embeddedDocuments.get(document);
        return languageService.doValidation(embedded, stylesheets.get(embedded));
      }
    },
    doComplete(document, position) {
      const embedded = embeddedDocuments.get(document);
      const emmetSyntax = languageId === 'postcss' ? 'css' : languageId;
      const lsCompletions = languageService.doComplete(embedded, position, stylesheets.get(embedded));
      const lsItems = lsCompletions ? _.map(lsCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Platform + i.label
        };
      }) : [];

      const emmetCompletions = emmet.doComplete(document, position, emmetSyntax, config.emmet);
      if (!emmetCompletions) {
        return { isIncomplete: false, items: lsItems };
      } else {
        const emmetItems = _.map(emmetCompletions.items, i => {
          return {
            ...i,
            sortText: Priority.Emmet + i.label
          };
        });
        return {
          isIncomplete: emmetCompletions.isIncomplete,
          items: _.concat(emmetItems, lsItems)
        };
      }
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doHover(embedded, position, stylesheets.get(embedded)) || NULL_HOVER;
    },
    findDocumentHighlight(document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentHighlights(embedded, position, stylesheets.get(embedded));
    },
    findDocumentSymbols(document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentSymbols(embedded, stylesheets.get(embedded));
    },
    findDefinition(document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDefinition(embedded, position, stylesheets.get(embedded));
    },
    findReferences(document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findReferences(embedded, position, stylesheets.get(embedded));
    },
    findDocumentColors(document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentColors(embedded, stylesheets.get(embedded));
    },
    getColorPresentations(document, color, range) {
      const embedded = embeddedDocuments.get(document);
      return languageService.getColorPresentations(embedded, stylesheets.get(embedded), color, range);
    },
    format(document, currRange, formattingOptions) {
      if (config.vetur.format.defaultFormatter[languageId] === 'none') {
        return [];
      }

      const { value, range } = getValueAndRange(document, currRange);
      const needIndent = config.vetur.format.styleInitialIndent;
      const parserMap: { [k: string]: ParserOption } = {
        css: 'css',
        postcss: 'css',
        scss: 'scss',
        less: 'less'
      };
      return prettierify(
        value,
        getFileFsPath(document.uri),
        range,
        needIndent,
        formattingOptions,
        config.prettier,
        parserMap[languageId]
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
