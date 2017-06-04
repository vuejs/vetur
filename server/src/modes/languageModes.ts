import {
  CompletionItem,
  Location,
  SignatureHelp,
  Definition,
  TextEdit,
  TextDocument,
  Diagnostic,
  DocumentLink,
  Range,
  Hover,
  DocumentHighlight,
  CompletionList,
  Position,
  FormattingOptions,
  SymbolInformation
} from 'vscode-languageserver-types';
import { getVueHTMLLanguageService, DocumentContext } from './vueHTML/ls'

import { getLanguageModelCache, LanguageModelCache } from '../languageModelCache';
import { getDocumentRegions, VueDocumentRegions } from './embeddedSupport';
import { getCSSMode, getSCSSMode, getLESSMode } from './cssMode';
import { getJavascriptMode } from './javascriptMode';
import { getVueHTMLMode } from './vueHTML';
import { getVueMode } from './vueMode';

export interface LanguageMode {
  getId();
  configure?: (options: any) => void;
  doValidation?: (document: TextDocument) => Diagnostic[];
  doComplete?: (document: TextDocument, position: Position) => CompletionList;
  doScaffoldComplete?: () => CompletionList;
  doResolve?: (document: TextDocument, item: CompletionItem) => CompletionItem;
  doHover?: (document: TextDocument, position: Position) => Hover;
  doSignatureHelp?: (document: TextDocument, position: Position) => SignatureHelp;
  findDocumentHighlight?: (document: TextDocument, position: Position) => DocumentHighlight[];
  findDocumentSymbols?: (document: TextDocument) => SymbolInformation[];
  findDocumentLinks?: (document: TextDocument, documentContext: DocumentContext) => DocumentLink[];
  findDefinition?: (document: TextDocument, position: Position) => Definition;
  findReferences?: (document: TextDocument, position: Position) => Location[];
  format?: (document: TextDocument, range: Range, options: FormattingOptions) => TextEdit[];
  findColorSymbols?: (document: TextDocument) => Range[];
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModes {
  getModeAtPosition(document: TextDocument, position: Position): LanguageMode;
  getModesInRange(document: TextDocument, range: Range): LanguageModeRange[];
  getAllModes(): LanguageMode[];
  getAllModesInDocument(document: TextDocument): LanguageMode[];
  getMode(languageId: string): LanguageMode;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModeRange extends Range {
  mode: LanguageMode;
  attributeValue?: boolean;
}

export function getLanguageModes(workspacePath: string): LanguageModes {
  const vueHTMLLanguageService = getVueHTMLLanguageService();
  const documentRegions = getLanguageModelCache<VueDocumentRegions>(10, 60, document =>
    getDocumentRegions(vueHTMLLanguageService, document)
  );

  let modelCaches: LanguageModelCache<any>[] = [];
  modelCaches.push(documentRegions);

  let modes = {
    vue: getVueMode(),
    'vue-html': getVueHTMLMode(documentRegions),
    css: getCSSMode(vueHTMLLanguageService, documentRegions),
    scss: getSCSSMode(vueHTMLLanguageService, documentRegions),
    less: getLESSMode(vueHTMLLanguageService, documentRegions),
    javascript: getJavascriptMode(documentRegions, workspacePath)
  };
  modes['typescript'] = modes.javascript;

  return {
    getModeAtPosition(document: TextDocument, position: Position): LanguageMode {
      const languageId = documentRegions.get(document).getLanguageAtPosition(position);
      if (languageId) {
        return modes[languageId];
      }
      return null;
    },
    getModesInRange(document: TextDocument, range: Range): LanguageModeRange[] {
      return documentRegions.get(document).getLanguageRanges(range).map(r => {
        return {
          start: r.start,
          end: r.end,
          mode: modes[r.languageId],
          attributeValue: r.attributeValue
        };
      });
    },
    getAllModesInDocument(document: TextDocument): LanguageMode[] {
      const result = [];
      for (let languageId of documentRegions.get(document).getLanguagesInDocument()) {
        const mode = modes[languageId];
        if (mode) {
          result.push(mode);
        }
      }
      return result;
    },
    getAllModes(): LanguageMode[] {
      const result = [];
      for (let languageId in modes) {
        const mode = modes[languageId];
        if (mode) {
          result.push(mode);
        }
      }
      return result;
    },
    getMode(languageId: string): LanguageMode {
      return modes[languageId];
    },
    onDocumentRemoved(document: TextDocument) {
      modelCaches.forEach(mc => mc.onDocumentRemoved(document));
      for (let mode in modes) {
        modes[mode].onDocumentRemoved(document);
      }
    },
    dispose(): void {
      modelCaches.forEach(mc => mc.dispose());
      modelCaches = [];
      for (let mode in modes) {
        modes[mode].dispose();
      }
      modes = null;
    }
  };
}
