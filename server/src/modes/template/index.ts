import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { DocumentContext } from '../../service';
import { TextDocument, Position, Range, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';

import { HTMLDocument } from './parser/htmlParser'
import { doComplete } from './services/htmlCompletion'
import { doHover } from './services/htmlHover'
import { findDocumentHighlights } from './services/htmlHighlighting'
import { findDocumentLinks } from './services/htmlLinks'
import { findDocumentSymbols } from './services/htmlSymbolsProvider'
import { htmlFormat } from './services/formatters'
import { parseHTMLDocument } from './parser/htmlParser'
import { ScriptMode } from '../script/javascript'

export function getVueHTMLMode (documentRegions: LanguageModelCache<VueDocumentRegions>, jsMode: ScriptMode): LanguageMode {
  let settings: any = {};
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument('vue-html'));
  const vueDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => parseHTMLDocument(document));

  return {
    getId () {
      return 'vue-html';
    },
    configure (options: any) {
      settings = options && options.html;
    },
    doComplete (document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      const scriptDoc = documentRegions.get(document).getEmbeddedDocument('javascript') || documentRegions.get(document).getEmbeddedDocument('typescript')
      const additionalTags = jsMode.findComponents(scriptDoc)
      return doComplete(embedded, position, vueDocuments.get(embedded), { html5: true }, additionalTags);
    },
    doHover (document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return doHover(embedded, position, vueDocuments.get(embedded));
    },
    findDocumentHighlight (document: TextDocument, position: Position) {
      return findDocumentHighlights(document, position, vueDocuments.get(document));
    },
    findDocumentLinks (document: TextDocument, documentContext: DocumentContext) {
      return findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols (document: TextDocument) {
      return findDocumentSymbols(document, vueDocuments.get(document));
    },
    format (document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
      return htmlFormat(document, range, formattingOptions);
    },
    onDocumentRemoved (document: TextDocument) {
      vueDocuments.onDocumentRemoved(document);
    },
    dispose () {
      vueDocuments.dispose();
    }
  };
};
