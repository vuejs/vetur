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
import { DocumentService, VueDocumentInfo } from '../services/documentService';
import { ExternalDocumentService } from '../services/externalDocumentService';

export interface LanguageMode {
  getId(): string;
  configure?(options: any): void;
  configureService?(infoService: VueInfoService): void;
  updateFileInfo?(doc: VueDocumentInfo): void;

  doValidation?(document: VueDocumentInfo): Diagnostic[];
  doComplete?(document: VueDocumentInfo, position: Position): CompletionList;
  doResolve?(document: VueDocumentInfo, item: CompletionItem): CompletionItem;
  doHover?(document: VueDocumentInfo, position: Position): Hover;
  doSignatureHelp?(document: VueDocumentInfo, position: Position): SignatureHelp | null;
  findDocumentHighlight?(document: VueDocumentInfo, position: Position): DocumentHighlight[];
  findDocumentSymbols?(document: VueDocumentInfo): SymbolInformation[];
  findDocumentLinks?(document: VueDocumentInfo, documentContext: DocumentContext): DocumentLink[];
  findDefinition?(document: VueDocumentInfo, position: Position): Definition;
  findReferences?(document: VueDocumentInfo, position: Position): Location[];
  format?(document: VueDocumentInfo, range: Range, options: FormattingOptions): TextEdit[];
  findDocumentColors?(document: VueDocumentInfo): ColorInformation[];
  getColorPresentations?(document: VueDocumentInfo, color: Color, range: Range): ColorPresentation[];

  onDocumentChanged?(filePath: string): void;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModes {
  getModeAtPosition(document: VueDocumentInfo, position: Position): LanguageMode | null;
  getModesInRange(document: VueDocumentInfo, range: Range): LanguageModeRange[];
  getAllModes(): LanguageMode[];
  getAllModesInDocument(document: VueDocumentInfo): LanguageMode[];
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
  documentService: DocumentService,
  externalDocumentService: ExternalDocumentService
): LanguageModes {
  let modelCaches: LanguageModelCache<any>[] = [];

  const jsMode = getJavascriptMode(documentService, externalDocumentService, workspacePath);
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
    getModeAtPosition(document: VueDocumentInfo, position: Position): LanguageMode | null {
      const languageId = document.regions.getLanguageAtPosition(position);
      if (languageId) {
        return modes[languageId];
      }
      return null;
    },
    getModesInRange(document: VueDocumentInfo, range: Range): LanguageModeRange[] {
      return document.regions.getLanguageRanges(range).map(r => {
        return {
          start: r.start,
          end: r.end,
          mode: modes[r.languageId],
          attributeValue: r.attributeValue
        };
      });
    },
    getAllModesInDocument(document: VueDocumentInfo): LanguageMode[] {
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
