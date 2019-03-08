import * as path from 'path';
import {
  DidChangeConfigurationParams,
  DocumentColorParams,
  DocumentFormattingParams,
  DocumentLinkParams,
  FileChangeType,
  IConnection,
  TextDocumentPositionParams,
  ColorPresentationParams
} from 'vscode-languageserver';
import {
  ColorInformation,
  CompletionItem,
  CompletionList,
  Definition,
  Diagnostic,
  DocumentHighlight,
  DocumentLink,
  DocumentSymbolParams,
  Hover,
  Location,
  Position,
  Range,
  SignatureHelp,
  SymbolInformation,
  TextDocument,
  TextDocumentChangeEvent,
  TextEdit,
  ColorPresentation
} from 'vscode-languageserver-types';
import Uri from 'vscode-uri';
import { getLanguageModes, LanguageModes } from '../modes/languageModes';
import { NULL_COMPLETION, NULL_HOVER, NULL_SIGNATURE } from '../modes/nullMode';
import { DocumentContext } from '../types';
import { DocumentService, DocumentInfo } from './documentService';
import { VueInfoService } from './vueInfoService';

export class VLS {
  private documentService: DocumentService;

  private languageModes: LanguageModes;

  private pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
  private validationDelayMs = 200;
  private validation: { [k: string]: boolean } = {
    'vue-html': true,
    html: true,
    css: true,
    scss: true,
    less: true,
    postcss: true,
    javascript: true
  };

  private vueInfoService: VueInfoService;

  constructor(private workspacePath: string, private lspConnection: IConnection) {
    this.documentService = new DocumentService();
    this.documentService.listen(lspConnection);

    this.languageModes = getLanguageModes(workspacePath, this.documentService);
    this.vueInfoService = new VueInfoService(this.languageModes);
    this.languageModes.getAllModes().forEach(m => {
      if (m.configureService) {
        m.configureService(this.vueInfoService);
      }
    });

    this.setupConfigListeners();
    this.setupLanguageFeatures();
    this.setupFileChangeListeners();

    this.lspConnection.onShutdown(() => {
      this.dispose();
    });
  }

  private setupConfigListeners() {
    this.lspConnection.onDidChangeConfiguration(({ settings }: DidChangeConfigurationParams) => {
      this.configure(settings);
    });

    this.documentService.getAllDocuments().forEach(this.triggerValidation);
  }

  private setupLanguageFeatures() {
    this.lspConnection.onCompletion(this.onCompletion.bind(this));
    this.lspConnection.onCompletionResolve(this.onCompletionResolve.bind(this));

    this.lspConnection.onDefinition(this.onDefinition.bind(this));
    this.lspConnection.onDocumentFormatting(this.onDocumentFormatting.bind(this));
    this.lspConnection.onDocumentHighlight(this.onDocumentHighlight.bind(this));
    this.lspConnection.onDocumentLinks(this.onDocumentLinks.bind(this));
    this.lspConnection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
    this.lspConnection.onHover(this.onHover.bind(this));
    this.lspConnection.onReferences(this.onReferences.bind(this));
    this.lspConnection.onSignatureHelp(this.onSignatureHelp.bind(this));

    this.lspConnection.onDocumentColor(this.onDocumentColors.bind(this));
    this.lspConnection.onColorPresentation(this.onColorPresentations.bind(this));
  }

  private setupFileChangeListeners() {
    this.documentService.onDidChangeContent((change: TextDocumentChangeEvent) => {
      this.triggerValidation(this.documentService.getDocumentInfo(change.document.uri)!);
    });
    this.documentService.onDidSave((change: TextDocumentChangeEvent) => {
      this.triggerValidation(this.documentService.getDocumentInfo(change.document.uri)!);
    });
    this.documentService.onDidClose(e => {
      this.removeDocument(e.document);
    });
    this.lspConnection.onDidChangeWatchedFiles(({ changes }) => {
      const jsMode = this.languageModes.getMode('javascript');
      changes.forEach(c => {
        if (c.type === FileChangeType.Changed) {
          const fsPath = Uri.parse(c.uri).fsPath;
          jsMode.onDocumentChanged!(fsPath);
        }
      });

      this.documentService.getAllDocuments().forEach(d => {
        this.triggerValidation(d);
      });
    });
  }

  configure(config: any): void {
    const veturValidationOptions = config.vetur.validation;
    this.validation['vue-html'] = veturValidationOptions.template;
    this.validation.css = veturValidationOptions.style;
    this.validation.postcss = veturValidationOptions.style;
    this.validation.scss = veturValidationOptions.style;
    this.validation.less = veturValidationOptions.style;
    this.validation.javascript = veturValidationOptions.script;

    this.languageModes.getAllModes().forEach(m => {
      if (m.configure) {
        m.configure(config);
      }
    });
  }

  /**
   * Custom Notifications
   */

  displayInfoMessage(msg: string): void {
    this.lspConnection.sendNotification('$/displayInfo', msg);
  }
  displayWarningMessage(msg: string): void {
    this.lspConnection.sendNotification('$/displayWarning', msg);
  }
  displayErrorMessage(msg: string): void {
    this.lspConnection.sendNotification('$/displayError', msg);
  }

  /**
   * Language Features
   */

  onDocumentFormatting({ textDocument, options }: DocumentFormattingParams): TextEdit[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;

    const fullDocRange = Range.create(Position.create(0, 0), info.positionAt(info.getText().length));

    const modeRanges = this.languageModes.getModesInRange(info, fullDocRange);
    const allEdits: TextEdit[] = [];

    const errMessages: string[] = [];

    modeRanges.forEach(range => {
      if (range.mode && range.mode.format) {
        try {
          const edits = range.mode.format(info, range, options);
          for (const edit of edits) {
            allEdits.push(edit);
          }
        } catch (err) {
          errMessages.push(err.toString());
        }
      }
    });

    if (errMessages.length !== 0) {
      this.displayErrorMessage('Formatting failed: "' + errMessages.join('\n') + '"');
      return [];
    }

    return allEdits;
  }

  onCompletion({ textDocument, position }: TextDocumentPositionParams): CompletionList {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.doComplete) {
      return mode.doComplete(info, position);
    }

    return NULL_COMPLETION;
  }

  onCompletionResolve(item: CompletionItem): CompletionItem {
    if (item.data) {
      const { uri, languageId } = item.data;
      if (uri && languageId) {
        const info = this.documentService.getDocumentInfo(uri)!;
        const mode = this.languageModes.getMode(languageId);
        if (info && mode && mode.doResolve) {
          return mode.doResolve(info, item);
        }
      }
    }

    return item;
  }

  onHover({ textDocument, position }: TextDocumentPositionParams): Hover {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.doHover) {
      return mode.doHover(info, position);
    }
    return NULL_HOVER;
  }

  onDocumentHighlight({ textDocument, position }: TextDocumentPositionParams): DocumentHighlight[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.findDocumentHighlight) {
      return mode.findDocumentHighlight(info, position);
    }
    return [];
  }

  onDefinition({ textDocument, position }: TextDocumentPositionParams): Definition {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.findDefinition) {
      return mode.findDefinition(info, position);
    }
    return [];
  }

  onReferences({ textDocument, position }: TextDocumentPositionParams): Location[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.findReferences) {
      return mode.findReferences(info, position);
    }
    return [];
  }

  onDocumentLinks({ textDocument }: DocumentLinkParams): DocumentLink[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const documentContext: DocumentContext = {
      resolveReference: ref => {
        if (this.workspacePath && ref[0] === '/') {
          return Uri.file(path.resolve(this.workspacePath, ref)).toString();
        }
        const docUri = Uri.parse(info.uri);
        return docUri
          .with({
            path: path.resolve(docUri.path, ref)
          })
          .toString();
      }
    };

    const links: DocumentLink[] = [];
    this.languageModes.getAllModesInDocument(info).forEach(m => {
      if (m.findDocumentLinks) {
        pushAll(links, m.findDocumentLinks(info, documentContext));
      }
    });
    return links;
  }

  onDocumentSymbol({ textDocument }: DocumentSymbolParams): SymbolInformation[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const symbols: SymbolInformation[] = [];

    this.languageModes.getAllModesInDocument(info).forEach(m => {
      if (m.findDocumentSymbols) {
        pushAll(symbols, m.findDocumentSymbols(info));
      }
    });
    return symbols;
  }

  onDocumentColors({ textDocument }: DocumentColorParams): ColorInformation[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const colors: ColorInformation[] = [];

    this.languageModes.getAllModesInDocument(info).forEach(m => {
      if (m.findDocumentColors) {
        pushAll(colors, m.findDocumentColors(info));
      }
    });
    return colors;
  }

  onColorPresentations({ textDocument, color, range }: ColorPresentationParams): ColorPresentation[] {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, range.start);
    if (mode && mode.getColorPresentations) {
      return mode.getColorPresentations(info, color, range);
    }
    return [];
  }

  onSignatureHelp({ textDocument, position }: TextDocumentPositionParams): SignatureHelp | null {
    const info = this.documentService.getDocumentInfo(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(info, position);
    if (mode && mode.doSignatureHelp) {
      return mode.doSignatureHelp(info, position);
    }
    return NULL_SIGNATURE;
  }

  /**
   * Validations
   */

  private triggerValidation(documentInfo: DocumentInfo): void {
    this.cleanPendingValidation(documentInfo);
    this.pendingValidationRequests[documentInfo.uri] = setTimeout(() => {
      delete this.pendingValidationRequests[documentInfo.uri];
      this.validateTextDocument(documentInfo);
    }, this.validationDelayMs);
  }

  cleanPendingValidation(documentInfo: DocumentInfo): void {
    const request = this.pendingValidationRequests[documentInfo.uri];
    if (request) {
      clearTimeout(request);
      delete this.pendingValidationRequests[documentInfo.uri];
    }
  }

  validateTextDocument(documentInfo: DocumentInfo): void {
    const diagnostics: Diagnostic[] = this.doValidate(documentInfo);
    this.lspConnection.sendDiagnostics({ uri: documentInfo.uri, diagnostics });
  }

  doValidate(doc: DocumentInfo): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (doc.languageId === 'vue') {
      this.languageModes.getAllModesInDocument(doc).forEach(mode => {
        if (mode.doValidation && this.validation[mode.getId()]) {
          pushAll(diagnostics, mode.doValidation(doc));
        }
      });
    }
    return diagnostics;
  }

  removeDocument(info: TextDocument): void {
    this.languageModes.onDocumentRemoved(info);
  }

  dispose(): void {
    this.languageModes.dispose();
  }
}

function pushAll<T>(to: T[], from: T[]) {
  if (from) {
    for (let i = 0; i < from.length; i++) {
      to.push(from[i]);
    }
  }
}
