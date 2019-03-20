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
  SymbolInformation,
  ColorInformation,
  Color,
  ColorPresentation
} from 'vscode-languageserver-types';

import { getLanguageModelCache, LanguageModelCache } from './languageModelCache';
import { getDocumentRegions, VueDocumentRegions } from './embeddedSupport';
import { getVueMode } from './vue';
import { getCSSMode, getSCSSMode, getLESSMode, getPostCSSMode } from './style';
import { getJavascriptMode } from './script/javascript';
import { getVueHTMLMode } from './template';
import { getStylusMode } from './style/stylus';
import { DocumentContext } from '../types';
import { VueInfoService } from '../services/vueInfoService';
import { DependencyService } from '../services/dependencyService';

export interface VLSServices {
  infoService?: VueInfoService;
  dependencyService?: DependencyService;
}

export interface LanguageMode {
  getId(): string;
  configure?(options: any): void;
  updateFileInfo?(doc: TextDocument): void;

  doValidation?(document: TextDocument): Diagnostic[];
  doComplete?(document: TextDocument, position: Position): CompletionList;
  doResolve?(document: TextDocument, item: CompletionItem): CompletionItem;
  doHover?(document: TextDocument, position: Position): Hover;
  doSignatureHelp?(document: TextDocument, position: Position): SignatureHelp | null;
  findDocumentHighlight?(document: TextDocument, position: Position): DocumentHighlight[];
  findDocumentSymbols?(document: TextDocument): SymbolInformation[];
  findDocumentLinks?(document: TextDocument, documentContext: DocumentContext): DocumentLink[];
  findDefinition?(document: TextDocument, position: Position): Definition;
  findReferences?(document: TextDocument, position: Position): Location[];
  format?(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
  findDocumentColors?(document: TextDocument): ColorInformation[];
  getColorPresentations?(document: TextDocument, color: Color, range: Range): ColorPresentation[];

  onDocumentChanged?(filePath: string): void;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModeRange extends Range {
  mode: LanguageMode;
  attributeValue?: boolean;
}

export class LanguageModes {
  private modes: { [k: string]: LanguageMode } = {};
  private documentRegions: LanguageModelCache<VueDocumentRegions>;
  private modelCaches: LanguageModelCache<any>[];

  constructor() {
    this.documentRegions = getLanguageModelCache<VueDocumentRegions>(10, 60, document => getDocumentRegions(document));

    this.modelCaches = [];
    this.modelCaches.push(this.documentRegions);
  }

  async init(workspacePath: string, services: VLSServices) {
    const vueHtmlMode = getVueHTMLMode(this.documentRegions, workspacePath, services.infoService);
    const jsMode = await getJavascriptMode(
      this.documentRegions,
      workspacePath,
      services.infoService,
      services.dependencyService
    );

    this.modes['vue'] = getVueMode();
    this.modes['vue-html'] = vueHtmlMode;
    this.modes['css'] = getCSSMode(this.documentRegions);
    this.modes['postcss'] = getPostCSSMode(this.documentRegions);
    this.modes['scss'] = getSCSSMode(this.documentRegions);
    this.modes['less'] = getLESSMode(this.documentRegions);
    this.modes['stylus'] = getStylusMode(this.documentRegions);
    this.modes['javascript'] = jsMode;
    this.modes['tsx'] = jsMode;
    this.modes['typescript'] = jsMode;
  }

  getModeAtPosition(document: TextDocument, position: Position): LanguageMode | null {
    const languageId = this.documentRegions.get(document).getLanguageAtPosition(position);
    if (languageId) {
      return this.modes[languageId];
    }
    return null;
  }

  getModesInRange(document: TextDocument, range: Range): LanguageModeRange[] {
    return this.documentRegions
      .get(document)
      .getLanguageRanges(range)
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
    for (const languageId of this.documentRegions.get(document).getLanguagesInDocument()) {
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

  onDocumentRemoved(document: TextDocument) {
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
