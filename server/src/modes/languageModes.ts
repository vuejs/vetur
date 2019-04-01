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
  TextDocument,
  Command
} from 'vscode-languageserver-types';

import { LanguageModelCache } from './languageModelCache';
import { getVueMode } from './vue';
import { getCSSMode, getSCSSMode, getLESSMode, getPostCSSMode } from './style';
import { getJavascriptMode } from './script/javascript';
import { getVueHTMLMode } from './template';
import { getStylusMode } from './style/stylus';
import { DocumentContext, RefactorAction } from '../types';
import { VueInfoService } from '../services/vueInfoService';
import { DocumentService, VueDocumentInfo } from '../services/documentService';
import { ExternalDocumentService } from '../services/externalDocumentService';
import { DependencyService } from '../services/dependencyService';

export interface VLSServices {
  infoService?: VueInfoService;
  dependencyService?: DependencyService;
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

export interface LanguageModeRange extends Range {
  mode: LanguageMode;
  attributeValue?: boolean;
}

export class LanguageModes {
  private modes: { [k: string]: LanguageMode } = {};
  private modelCaches: LanguageModelCache<any>[];

  constructor(
    private readonly documentService: DocumentService,
    private readonly externalDocumentService: ExternalDocumentService
  ) {
    this.modelCaches = [];
  }

  async init(workspacePath: string, services: VLSServices) {
    const vueHtmlMode = getVueHTMLMode(this.documentService, workspacePath, services.infoService);
    const jsMode = await getJavascriptMode(
      this.documentService,
      this.externalDocumentService,
      workspacePath,
      services.infoService,
      services.dependencyService
    );

    this.modes['vue'] = getVueMode();
    this.modes['vue-html'] = vueHtmlMode;
    this.modes['css'] = getCSSMode(this.documentService);
    this.modes['postcss'] = getPostCSSMode(this.documentService);
    this.modes['scss'] = getSCSSMode(this.documentService);
    this.modes['less'] = getLESSMode(this.documentService);
    this.modes['stylus'] = getStylusMode(this.documentService);
    this.modes['javascript'] = jsMode;
    this.modes['tsx'] = jsMode;
    this.modes['typescript'] = jsMode;
  }

  getModeAtPosition(document: TextDocument, position: Position): LanguageMode | null {
    const languageId = this.documentService.getDocumentInfo(document)!.regions.getLanguageAtPosition(position);
    if (languageId) {
      return this.modes[languageId];
    }
    return null;
  }

  getModesInRange(document: TextDocument, range: Range): LanguageModeRange[] {
    return this.documentService
      .getDocumentInfo(document)!
      .regions.getLanguageRanges(range)
      .map(r => {
        return {
          start: r.start,
          end: r.end,
          mode: this.modes[r.languageId],
          attributeValue: r.attributeValue
        };
      });
  }

  getAllModesInDocument(document: TextDocument): LanguageMode[] {
    const result = [];
    for (const languageId of this.documentService.getDocumentInfo(document)!.regions.getLanguagesInDocument()) {
      const mode = this.modes[languageId];
      if (mode) {
        result.push(mode);
      }
    }
    return result;
  }

  getAllModes(): LanguageMode[] {
    const result = [];
    for (const languageId in this.modes) {
      const mode = this.modes[languageId];
      if (mode) {
        result.push(mode);
      }
    }
    return result;
  }

  getMode(languageId: string): LanguageMode {
    return this.modes[languageId];
  }

  onDocumentRemoved(document: VueDocumentInfo) {
    this.modelCaches.forEach(mc => mc.onDocumentRemoved(document));
    for (const mode in this.modes) {
      this.modes[mode].onDocumentRemoved(document);
    }
  }

  dispose(): void {
    this.modelCaches.forEach(mc => mc.dispose());
    this.modelCaches = [];
    for (const mode in this.modes) {
      this.modes[mode].dispose();
    }
    this.modes = {}; // drop all references
  }
}
