import { LanguageService as VueHTMLLanguageService } from './vueHTML/ls';
import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { TextDocument, Position, TextEdit, FormattingOptions, Range } from 'vscode-languageserver-types';
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  Stylesheet,
  LanguageService
} from 'vscode-css-languageservice';
import { LanguageMode } from './languageModes';
import { VueDocumentRegions, CSS_STYLE_RULE } from './embeddedSupport';

export function getCSSMode(vueHTMLLs: VueHTMLLanguageService, documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getCSSLanguageService();
  return getStyleMode('css', vueHTMLLs, languageService, documentRegions);
}

export function getSCSSMode(vueHTMLLs: VueHTMLLanguageService, documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getSCSSLanguageService();
  return getStyleMode('scss', vueHTMLLs, languageService, documentRegions);
}
export function getLESSMode(vueHTMLLs: VueHTMLLanguageService, documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const languageService = getLESSLanguageService();
  return getStyleMode('less', vueHTMLLs, languageService, documentRegions);
}

function getStyleMode(
  languageId: string,
  vueHTMLLs: VueHTMLLanguageService,
  languageService: LanguageService,
  documentRegions: LanguageModelCache<VueDocumentRegions>
): LanguageMode {
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document =>
    documentRegions.get(document).getEmbeddedDocument(languageId)
  );
  const stylesheets = getLanguageModelCache<Stylesheet>(10, 60, document => languageService.parseStylesheet(document));

  return {
    getId() {
      return languageId;
    },
    configure(options: any) {
      languageService.configure(options && options.css);
    },
    doValidation(document: TextDocument) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doValidation(embedded, stylesheets.get(embedded));
    },
    doComplete(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doComplete(embedded, position, stylesheets.get(embedded));
    },
    doHover(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.doHover(embedded, position, stylesheets.get(embedded));
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentHighlights(embedded, position, stylesheets.get(embedded));
    },
    findDocumentSymbols(document: TextDocument) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDocumentSymbols(embedded, stylesheets.get(embedded)).filter(s => s.name !== CSS_STYLE_RULE);
    },
    findDefinition(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findDefinition(embedded, position, stylesheets.get(embedded));
    },
    findReferences(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findReferences(embedded, position, stylesheets.get(embedded));
    },
    findColorSymbols(document: TextDocument) {
      const embedded = embeddedDocuments.get(document);
      return languageService.findColorSymbols(embedded, stylesheets.get(embedded));
    },
    format(document: TextDocument, range: Range, formattingOptions: FormattingOptions): TextEdit[] {
      return vueHTMLLs.cssFormat(document, range, formattingOptions);
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
}
