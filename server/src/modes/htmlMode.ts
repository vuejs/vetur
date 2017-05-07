import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { Vls, HTMLDocument, DocumentContext } from 'vetur-vls';
import { TextDocument, Position, Range, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from './languageModes';
import { HTMLDocumentRegions } from './embeddedSupport';

export function getVueHTMLMode(vls: Vls, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  let settings: any = {};
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument('vue-html'));
  const vueDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => vls.parseHTMLDocument(document));

  return {
    getId() {
      return 'vue-html';
    },
    configure(options: any) {
      settings = options && options.html;
    },
    doComplete(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return vls.doComplete(embedded, position, vueDocuments.get(embedded), { html5: true, angular1: true });
    },
    doHover(document: TextDocument, position: Position) {
      return vls.doHover(document, position, vueDocuments.get(document));
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      return vls.findDocumentHighlights(document, position, vueDocuments.get(document));
    },
    findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
      return vls.findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols(document: TextDocument) {
      return vls.findDocumentSymbols(document, vueDocuments.get(document));
    },
    format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
      return vls.htmlFormat(document, range, formattingOptions);
    },
    onDocumentRemoved(document: TextDocument) {
      vueDocuments.onDocumentRemoved(document);
    },
    dispose() {
      vueDocuments.dispose();
    }
  };
};
