import {
  CompletionItem,
  Location,
  SignatureHelp,
  Definition,
  TextEdit,
  Diagnostic,
  DocumentLink,
  Range,
  Hover,
  DocumentHighlight,
  CompletionList,
  Position,
  FormattingOptions,
  SymbolInformation,
  ColorInformation,
  Color,
  ColorPresentation,
  TextDocument
} from 'vscode-languageserver-types';

import { LanguageModelCache } from './languageModelCache';
import { getVueMode } from './vue';
import { getCSSMode, getSCSSMode, getLESSMode, getPostCSSMode } from './style';
import { getJavascriptMode } from './script/javascript';
import { getVueHTMLMode } from './template';
import { getStylusMode } from './style/stylus';
import { DocumentContext } from '../types';
import { VueInfoService } from '../services/vueInfoService';
import { DocumentService, DocumentInfo } from '../services/documentService';

export interface LanguageMode {
  getId(): string;
  configure?(options: any): void;
  configureService?(infoService: VueInfoService): void;
  updateFileInfo?(doc: DocumentInfo): void;

  doValidation?(document: DocumentInfo): Diagnostic[];
  doComplete?(document: DocumentInfo, position: Position): CompletionList;
  doResolve?(document: DocumentInfo, item: CompletionItem): CompletionItem;
  doHover?(document: DocumentInfo, position: Position): Hover;
  doSignatureHelp?(document: DocumentInfo, position: Position): SignatureHelp | null;
  findDocumentHighlight?(document: DocumentInfo, position: Position): DocumentHighlight[];
  findDocumentSymbols?(document: DocumentInfo): SymbolInformation[];
  findDocumentLinks?(document: DocumentInfo, documentContext: DocumentContext): DocumentLink[];
  findDefinition?(document: DocumentInfo, position: Position): Definition;
  findReferences?(document: DocumentInfo, position: Position): Location[];
  format?(document: DocumentInfo, range: Range, options: FormattingOptions): TextEdit[];
  findDocumentColors?(document: DocumentInfo): ColorInformation[];
  getColorPresentations?(document: DocumentInfo, color: Color, range: Range): ColorPresentation[];

  onDocumentChanged?(filePath: string): void;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModes {
  getModeAtPosition(document: DocumentInfo, position: Position): LanguageMode | null;
  getModesInRange(document: DocumentInfo, range: Range): LanguageModeRange[];
  getAllModes(): LanguageMode[];
  getAllModesInDocument(document: DocumentInfo): LanguageMode[];
  getMode(languageId: string): LanguageMode;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModeRange extends Range {
  mode: LanguageMode;
  attributeValue?: boolean;
}

export function getLanguageModes(
  workspacePath: string | null | undefined,
  documentService: DocumentService
): LanguageModes {
  let modelCaches: LanguageModelCache<any>[] = [];

  const jsMode = getJavascriptMode(documentService, workspacePath);
  let modes: { [k: string]: LanguageMode } = {
    vue: getVueMode(),
    'vue-html': getVueHTMLMode(documentService, workspacePath),
    css: getCSSMode(documentService),
    postcss: getPostCSSMode(documentService),
    scss: getSCSSMode(documentService),
    less: getLESSMode(documentService),
    stylus: getStylusMode(documentService),
    javascript: jsMode,
    tsx: jsMode,
    typescript: jsMode
  };

  return {
    getModeAtPosition(document: DocumentInfo, position: Position): LanguageMode | null {
      const languageId = document.regions.getLanguageAtPosition(position);
      if (languageId) {
        return modes[languageId];
      }
      return null;
    },
    getModesInRange(document: DocumentInfo, range: Range): LanguageModeRange[] {
      return document.regions.getLanguageRanges(range).map(r => {
        return {
          start: r.start,
          end: r.end,
          mode: modes[r.languageId],
          attributeValue: r.attributeValue
        };
      });
    },
    getAllModesInDocument(document: DocumentInfo): LanguageMode[] {
      const result = [];
      for (const languageId of document.regions.getLanguagesInDocument()) {
        const mode = modes[languageId];
        if (mode) {
          result.push(mode);
        }
      }
      return result;
    },
    getAllModes(): LanguageMode[] {
      const result = [];
      for (const languageId in modes) {
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
    onDocumentRemoved(doc: TextDocument) {
      modelCaches.forEach(mc => mc.onDocumentRemoved(doc));
      for (const mode in modes) {
        modes[mode].onDocumentRemoved(doc);
      }
    },
    dispose(): void {
      modelCaches.forEach(mc => mc.dispose());
      modelCaches = [];
      for (const mode in modes) {
        modes[mode].dispose();
      }
      modes = {}; // drop all references
    }
  };
}
