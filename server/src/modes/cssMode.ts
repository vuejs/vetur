import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { TextDocument, Position } from 'vscode-languageserver-types';
import { getCSSLanguageService, getSCSSLanguageService, getLESSLanguageService, Stylesheet, LanguageService } from 'vscode-css-languageservice';
import { LanguageMode } from './languageModes';
import { HTMLDocumentRegions, CSS_STYLE_RULE } from './embeddedSupport';

export function getCSSMode(documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('css', languageService, documentRegions);
}

export function getSCSSMode(documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode('scss', languageService, documentRegions);
}
export function getLESSMode(documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode('less', languageService, documentRegions);
}

function getStyleMode(languageId: string, languageService: LanguageService, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {

  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument(languageId));
  const stylesheets = getLanguageModelCache<Stylesheet>(10, 60, document => languageService.parseStylesheet(document));

  return {
    getId() {
      return languageId;
    },
    configure(options: any) {
      languageService.configure(options && options.css);
    },
    doValidation(document: TextDocument) {
      let embedded = embeddedDocuments.get(document);
      return languageService.doValidation(embedded, stylesheets.get(embedded));
    },
    doComplete(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return languageService.doComplete(embedded, position, stylesheets.get(embedded));
    },
    doHover(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return languageService.doHover(embedded, position, stylesheets.get(embedded));
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return languageService.findDocumentHighlights(embedded, position, stylesheets.get(embedded));
    },
    findDocumentSymbols(document: TextDocument) {
      let embedded = embeddedDocuments.get(document);
      return languageService.findDocumentSymbols(embedded, stylesheets.get(embedded)).filter(s => s.name !== CSS_STYLE_RULE);
    },
    findDefinition(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return languageService.findDefinition(embedded, position, stylesheets.get(embedded));
    },
    findReferences(document: TextDocument, position: Position) {
      let embedded = embeddedDocuments.get(document);
      return languageService.findReferences(embedded, position, stylesheets.get(embedded));
    },
    findColorSymbols(document: TextDocument) {
      let embedded = embeddedDocuments.get(document);
      return languageService.findColorSymbols(embedded, stylesheets.get(embedded));
    },
    onDocumentRemoved(document: TextDocument) {
      embeddedDocuments.onDocumentRemoved(document);
      stylesheets.onDocumentRemoved(document);
    },
    dispose() {
      embeddedDocuments.dispose();
      stylesheets.dispose();
    }
  };
};