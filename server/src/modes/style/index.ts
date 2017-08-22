import {
  TextDocument,
  Position,
  TextEdit,
  FormattingOptions,
  Range,
  CompletionList
} from 'vscode-languageserver-types';
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  LanguageService
} from 'vscode-css-languageservice';
import * as _ from 'lodash';
import { css as cssBeautify } from 'js-beautify';
import * as emmet from 'vscode-emmet-helper';

import { Priority } from './emmet';
import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';
import { defaultCssOptions } from './defaultOption';
import { wrapSection } from '../../utils/strings';

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

  return {
    getId() {
      return languageId;
    },
    configure(options) {
      languageService.configure(options && options.css);
    },
    doValidation(document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doValidation(embedded, stylesheets.get(embedded));
    },
    doComplete(document, position) {
      const embedded = embeddedDocuments.get(document);
      const emmetSyntax = languageId === 'postcss' ? 'css' : languageId;
      const emmetCompletions: CompletionList = emmet.doComplete(document, position, emmetSyntax, {
        useNewEmmet: true,
        showExpandedAbbreviation: true,
        showAbbreviationSuggestions: true,
        syntaxProfiles: {},
        variables: {}
      });
      const emmetItems = _.map(emmetCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Emmet + i.label
        };
      });
      const lsCompletions = languageService.doComplete(embedded, position, stylesheets.get(embedded));
      const lsItems = _.map(lsCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Platform + i.label
        };
      });
      return {
        isIncomplete: true,
        items: _.concat(emmetItems, lsItems)
      };
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doHover(embedded, position, stylesheets.get(embedded));
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
    findColorSymbols(document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findColorSymbols(embedded, stylesheets.get(embedded));
    },
    format(document, range, formattingOptions) {
      return cssFormat(document, range, formattingOptions);
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

export function cssFormat(document: TextDocument, currRange: Range, formattingOptions: FormattingOptions): TextEdit[] {
  const { value, range } = getValueAndRange(document, currRange);

  defaultCssOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultCssOptions.indent_size = formattingOptions.tabSize;

  let cssFormattingOptions = defaultCssOptions;
  if (formattingOptions.css) {
    cssFormattingOptions = _.assign(defaultCssOptions, formattingOptions.css);
  }

  const beautifiedCss = cssBeautify(value, cssFormattingOptions);
  const needIndent = !!formattingOptions.styleInitialIndent;
  const wrappedCss = wrapSection(beautifiedCss, needIndent, formattingOptions);
  return [
    {
      range,
      newText: wrappedCss
    }
  ];
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string; range: Range } {
  let value = document.getText();
  let range = currRange;

  let includesEnd = true;
  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    includesEnd = endOffset === value.length;
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}
