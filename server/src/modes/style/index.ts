import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { TextDocument, Position, TextEdit, FormattingOptions, Range } from 'vscode-languageserver-types';
import { getCSSLanguageService, getSCSSLanguageService, getLESSLanguageService, LanguageService } from 'vscode-css-languageservice';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions, CSS_STYLE_RULE } from '../embeddedSupport';
import { defaultCssOptions } from './defaultOption';

import * as _ from 'lodash';
import { css as cssBeautify } from 'js-beautify';

export function getCSSMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('css', languageService, documentRegions);
}

export function getSCSSMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode('scss', languageService, documentRegions);
}
export function getLESSMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode('less', languageService, documentRegions);
}

function getStyleMode (languageId: string, languageService: LanguageService, documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {

  const embeddedDocuments = getLanguageModelCache(10, 60, document => documentRegions.get(document).getEmbeddedDocument(languageId));
  const stylesheets = getLanguageModelCache(10, 60, document => languageService.parseStylesheet(document));

  return {
    getId () {
      return languageId;
    },
    configure (options) {
      languageService.configure(options && options.css);
    },
    doValidation (document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doValidation(embedded, stylesheets.get(embedded));
    },
    doComplete (document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doComplete(embedded, position, stylesheets.get(embedded));
    },
    doHover (document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doHover(embedded, position, stylesheets.get(embedded));
    },
    findDocumentHighlight (document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentHighlights(embedded, position, stylesheets.get(embedded));
    },
    findDocumentSymbols (document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentSymbols(embedded, stylesheets.get(embedded)).filter(s => s.name !== CSS_STYLE_RULE);
    },
    findDefinition (document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDefinition(embedded, position, stylesheets.get(embedded));
    },
    findReferences (document, position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findReferences(embedded, position, stylesheets.get(embedded));
    },
    findColorSymbols (document) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findColorSymbols(embedded, stylesheets.get(embedded));
    },
    format (document, range, formattingOptions) {
      return cssFormat(document, range, formattingOptions);
    },
    onDocumentRemoved (document) {
      embeddedDocuments.onDocumentRemoved(document);
      stylesheets.onDocumentRemoved(document);
    },
    dispose () {
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

  const beautifiedCss: string = cssBeautify(value, cssFormattingOptions);
  if (formattingOptions.styleInitialIndent) {
    const initialIndent = generateIndent(1, formattingOptions);
    const indentedCss = ('\n' + beautifiedCss).replace(/\n/g, '\n' + initialIndent) + '\n';
    return [{
      range: range,
      newText: indentedCss
    }];
  } else {
    return [{
      range: range,
      newText: '\n' + beautifiedCss + '\n'
    }];
  }
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string, range: Range } {
  let value = document.getText();
  let range = currRange;

  let includesEnd = true;
  if (currRange) {
    let startOffset = document.offsetAt(currRange.start);
    let endOffset = document.offsetAt(currRange.end);
    includesEnd = endOffset === value.length;
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}

function generateIndent(level: number, options: FormattingOptions) {
  if (options.insertSpaces) {
    return _.repeat(' ', level * options.tabSize);
  } else {
    return _.repeat('\t', level);
  }
}
