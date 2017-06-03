import { LanguageModelCache, getLanguageModelCache } from '../../languageModelCache';
import { getVueHtmlLanguageService, LanguageService, VueHTMLDocument, DocumentContext} from './vueHtmlLanguageService';
import { TextDocument, Position, Range, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';

export function getVueHTMLMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  let settings: any = {};
  const languageService = getVueHtmlLanguageService();
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument('vue-html'));
  const vueHTMLs = getLanguageModelCache<VueHTMLDocument>(10, 60, document => languageService.parseVueHTMLDocument(document));

  return {
    getId () {
      return 'vue-html';
    },
    configure (options: any) {
      settings = options && options.html;
    },
    doComplete (document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doComplete(embedded, position, vueHTMLs.get(embedded), { html5: true });
    },
    doHover (document: TextDocument, position: Position) {
      return languageService.doHover(document, position, vueHTMLs.get(document));
    },
    findDocumentHighlight (document: TextDocument, position: Position) {
      return languageService.findDocumentHighlights(document, position, vueHTMLs.get(document));
    },
    findDocumentLinks (document: TextDocument, documentContext: DocumentContext) {
      return languageService.findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols (document: TextDocument) {
      return languageService.findDocumentSymbols(document, vueHTMLs.get(document));
    },
    format (document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
      return languageService.htmlFormat(document, range, formattingOptions);
    },
    onDocumentRemoved (document: TextDocument) {
      vueHTMLs.onDocumentRemoved(document);
    },
    dispose () {
      vueHTMLs.dispose();
    }
  };
};
