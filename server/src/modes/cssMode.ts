import { Vls, HTMLDocument, DocumentContext } from 'vetur-vls';
import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { TextDocument, Position, TextEdit, FormattingOptions, Range } from 'vscode-languageserver-types';
import { getCSSLanguageService, getSCSSLanguageService, getLESSLanguageService, Stylesheet, LanguageService } from 'vscode-css-languageservice';
import { LanguageMode } from './languageModes';
import { HTMLDocumentRegions, CSS_STYLE_RULE } from './embeddedSupport';

export function getCSSMode(vls: Vls, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('css', vls, languageService, documentRegions);
}

export function getSCSSMode(vls: Vls, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode('scss', vls, languageService, documentRegions);
}
export function getLESSMode(vls: Vls, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode('less', vls, languageService, documentRegions);
}

function getStyleMode(languageId: string, vls: Vls, languageService: LanguageService, documentRegions: LanguageModelCache<HTMLDocumentRegions>): LanguageMode {

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
    format (document: TextDocument, range: Range, formattingOptions: FormattingOptions): TextEdit[] {
      return vls.cssFormat(document, range, formattingOptions);
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