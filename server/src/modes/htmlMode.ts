import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { LanguageService as HTMLLanguageService, HTMLDocument, DocumentContext, FormattingOptions } from 'vetur-vls';
import { TextDocument, Position, Range } from 'vscode-languageserver-types';
import { LanguageMode } from './languageModes';
import { HTMLDocumentRegions, CSS_STYLE_RULE } from './embeddedSupport';

export function getVueHTMLMode(htmlLanguageService: HTMLLanguageService, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  let settings: any = {};
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument('vue-html'));
  const htmlDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => htmlLanguageService.parseHTMLDocument(document));

  return {
    getId() {
      return 'vue-html';
    },
    configure(options: any) {
      settings = options && options.html;
    },
    doComplete(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return htmlLanguageService.doComplete(embedded, position, htmlDocuments.get(embedded), { html5: true, angular1: true });
    },
    doHover(document: TextDocument, position: Position) {
      return htmlLanguageService.doHover(document, position, htmlDocuments.get(document));
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      return htmlLanguageService.findDocumentHighlights(document, position, htmlDocuments.get(document));
    },
    findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
      return htmlLanguageService.findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols(document: TextDocument) {
      return htmlLanguageService.findDocumentSymbols(document, htmlDocuments.get(document));
    },
    format(document: TextDocument, range: Range, formatParams: FormattingOptions) {
      let formatSettings = settings && settings.format;
      if (!formatSettings) {
        formatSettings = formatParams;
      } else {
        formatSettings = merge(formatParams, merge(formatSettings, {}));
      }
      return htmlLanguageService.format(document, range, formatSettings);
    },
    onDocumentRemoved(document: TextDocument) {
      htmlDocuments.onDocumentRemoved(document);
    },
    dispose() {
      htmlDocuments.dispose();
    }
  };
};

function merge(src: any, dst: any): any {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      dst[key] = src[key];
    }
  }
  return dst;
}
