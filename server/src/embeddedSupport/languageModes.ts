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
  CodeActionContext,
  ColorInformation,
  Color,
  ColorPresentation,
  Command
} from 'vscode-languageserver-types';

import { getLanguageModelCache, LanguageModelCache } from './languageModelCache';
import { getVueDocumentRegions, VueDocumentRegions, LanguageId, LanguageRange } from './embeddedSupport';
import { getVueMode } from '../modes/vue';
import { getCSSMode, getSCSSMode, getLESSMode, getPostCSSMode } from '../modes/style';
import { getJavascriptMode } from '../modes/script/javascript';
import { getVueHTMLMode } from '../modes/template';
import { getStylusMode } from '../modes/style/stylus';
import { DocumentContext, RefactorAction } from '../types';
import { VueInfoService } from '../services/vueInfoService';
import { DocumentService, VueDocumentInfo } from '../services/documentService';
import { ExternalDocumentService } from '../services/externalDocumentService';
import { DependencyService } from '../services/dependencyService';
import { nullMode } from '../modes/nullMode';

export interface VLSServices {
  infoService?: VueInfoService;
  dependencyService?: DependencyService;
  documentService: DocumentService;
  externalDocumentService: ExternalDocumentService;
}

export interface LanguageMode {
  getId(): string;
  configure?(options: any): void;
  updateFileInfo?(doc: VueDocumentInfo): void;

  doValidation?(document: VueDocumentInfo): Diagnostic[];
  getCodeActions?(
    document: VueDocumentInfo,
    range: Range,
    formatParams: FormattingOptions,
    context: CodeActionContext
  ): Command[];
  getRefactorEdits?(doc: VueDocumentInfo, args: RefactorAction): Command;
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
  onDocumentRemoved(document: VueDocumentInfo): void;
  dispose(): void;
}

export interface LanguageModeRange extends LanguageRange {
  mode: LanguageMode;
}

export class LanguageModes {
  private modes: { [k in LanguageId]: LanguageMode } = {
    vue: nullMode,
    pug: nullMode,
    'vue-html': nullMode,
    css: nullMode,
    postcss: nullMode,
    scss: nullMode,
    less: nullMode,
    stylus: nullMode,
    javascript: nullMode,
    typescript: nullMode,
    tsx: nullMode
  };

  private documentRegions: LanguageModelCache<VueDocumentRegions>;
  private modelCaches: LanguageModelCache<any>[];

  constructor() {
    this.documentRegions = getLanguageModelCache<VueDocumentRegions>(10, 60, document =>
      getVueDocumentRegions(document)
    );

    this.modelCaches = [];
  }

  async init(workspacePath: string, services: VLSServices) {
    const vueHtmlMode = getVueHTMLMode(services.documentService, workspacePath, services.infoService);
    const jsMode = await getJavascriptMode(
      services.documentService,
      services.externalDocumentService,
      workspacePath,
      services.infoService,
      services.dependencyService
    );

    this.modes['vue'] = getVueMode();
    this.modes['vue-html'] = vueHtmlMode;
    this.modes['css'] = getCSSMode(services.documentService);
    this.modes['postcss'] = getPostCSSMode(services.documentService);
    this.modes['scss'] = getSCSSMode(services.documentService);
    this.modes['less'] = getLESSMode(services.documentService);
    this.modes['stylus'] = getStylusMode(services.documentService);
    this.modes['javascript'] = jsMode;
    this.modes['typescript'] = jsMode;
    this.modes['tsx'] = jsMode;
  }

  getModeAtPosition(document: VueDocumentInfo, position: Position): LanguageMode | undefined {
    const languageId = this.documentRegions.get(document).getLanguageAtPosition(position);
    return this.modes[languageId];
  }

  getAllLanguageModeRangesInDocument(document: VueDocumentInfo): LanguageModeRange[] {
    const result: LanguageModeRange[] = [];

    const documentRegions = this.documentRegions.get(document);

    documentRegions.getAllLanguageRanges().forEach(lr => {
      const mode = this.modes[lr.languageId];
      if (mode) {
        result.push({
          mode,
          ...lr
        });
      }
    });

    return result;
  }

  getAllModes(): LanguageMode[] {
    const result = [];
    for (const languageId in this.modes) {
      const mode = this.modes[<LanguageId>languageId];
      if (mode) {
        result.push(mode);
      }
    }
    return result;
  }

  getMode(languageId: LanguageId): LanguageMode | undefined {
    return this.modes[languageId];
  }

  onDocumentRemoved(document: VueDocumentInfo) {
    this.modelCaches.forEach(mc => mc.onDocumentRemoved(document));
    for (const mode in this.modes) {
      this.modes[<LanguageId>mode].onDocumentRemoved(document);
    }
  }

  dispose(): void {
    this.modelCaches.forEach(mc => mc.dispose());
    this.modelCaches = [];
    for (const mode in this.modes) {
      this.modes[<LanguageId>mode].dispose();
    }
    delete this.modes;
  }
}
