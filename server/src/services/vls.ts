import * as path from 'path';
import { getFileFsPath } from '../utils/paths';

import {
  DidChangeConfigurationParams,
  DocumentColorParams,
  DocumentFormattingParams,
  DocumentLinkParams,
  FileChangeType,
  IConnection,
  TextDocumentPositionParams,
  ColorPresentationParams,
  InitializeParams,
  ServerCapabilities,
  TextDocumentSyncKind,
  DocumentFormattingRequest,
  Disposable,
  DocumentSymbolParams,
  CodeActionParams
} from 'vscode-languageserver';
import {
  ColorInformation,
  CompletionItem,
  CompletionList,
  Definition,
  Diagnostic,
  DocumentHighlight,
  DocumentLink,
  Hover,
  Location,
  SignatureHelp,
  SymbolInformation,
  TextDocument,
  TextDocumentChangeEvent,
  TextEdit,
  ColorPresentation,
  Range
} from 'vscode-languageserver-types';

import Uri from 'vscode-uri';
import { LanguageModes, LanguageModeRange, LanguageMode } from '../embeddedSupport/languageModes';
import { NULL_COMPLETION, NULL_HOVER, NULL_SIGNATURE } from '../modes/nullMode';
import { VueInfoService } from './vueInfoService';
import { DependencyService } from './dependencyService';
import * as _ from 'lodash';
import { DocumentContext, RefactorAction } from '../types';
import { DocumentService } from './documentService';
import { VueHTMLMode } from '../modes/template';
import { logger } from '../log';
import { getDefaultVLSConfig, VLSFullConfig, VLSConfig } from '../config';
import { LanguageId } from '../embeddedSupport/embeddedSupport';

export class VLS {
  // @Todo: Remove this and DocumentContext
  private workspacePath: string | undefined;

  private documentService: DocumentService;
  private vueInfoService: VueInfoService;
  private dependencyService: DependencyService;

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

  private documentFormatterRegistration: Disposable | undefined;

  constructor(private lspConnection: IConnection) {
    this.documentService = new DocumentService(this.lspConnection);
    this.vueInfoService = new VueInfoService();
    this.dependencyService = new DependencyService();

    this.languageModes = new LanguageModes();
  }

  async init(params: InitializeParams) {
    const config: VLSFullConfig = params.initializationOptions.config
      ? _.merge(getDefaultVLSConfig(), params.initializationOptions.config)
      : getDefaultVLSConfig();

    const workspacePath = params.rootPath;
    if (!workspacePath) {
      console.error('No workspace path found. Vetur initialization failed.');
      return {
        capabilities: {}
      };
    }

    this.workspacePath = workspacePath;

    await this.vueInfoService.init(this.languageModes);
    await this.dependencyService.init(workspacePath, config.vetur.useWorkspaceDependencies);

    await this.languageModes.init(
      workspacePath,
      {
        infoService: this.vueInfoService,
        dependencyService: this.dependencyService
      },
      params.initializationOptions['globalSnippetDir']
    );

    this.setupConfigListeners();
    this.setupLSPHandlers();
    this.setupCustomLSPHandlers();
    this.setupFileChangeListeners();

    this.lspConnection.onShutdown(() => {
      this.dispose();
    });

    this.configure(config);
  }

  listen() {
    this.lspConnection.listen();
  }

  private setupConfigListeners() {
    this.lspConnection.onDidChangeConfiguration(async ({ settings }: DidChangeConfigurationParams) => {
      this.configure(settings);

      // onDidChangeConfiguration will fire for Language Server startup
      await this.setupDynamicFormatters(settings);
    });

    this.documentService.getAllDocuments().forEach(this.triggerValidation);
  }

  private setupLSPHandlers() {
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
    this.lspConnection.onCodeAction(this.onCodeAction.bind(this));

    this.lspConnection.onDocumentColor(this.onDocumentColors.bind(this));
    this.lspConnection.onColorPresentation(this.onColorPresentations.bind(this));

    this.lspConnection.onRequest('requestCodeActionEdits', this.getRefactorEdits.bind(this));
  }

  private setupCustomLSPHandlers() {
    this.lspConnection.onRequest('$/queryVirtualFileInfo', ({ fileName, currFileText }) => {
      return (this.languageModes.getMode('vue-html') as VueHTMLMode).queryVirtualFileInfo(fileName, currFileText);
    });

    this.lspConnection.onRequest('$/getDiagnostics', params => {
      const doc = this.documentService.getDocument(params.uri);
      if (doc) {
        return this.doValidate(doc);
      }
      return [];
    });
  }

  private async setupDynamicFormatters(settings: any) {
    if (settings.vetur.format.enable === true) {
      if (!this.documentFormatterRegistration) {
        this.documentFormatterRegistration = await this.lspConnection.client.register(DocumentFormattingRequest.type, {
          documentSelector: ['vue']
        });
      }
    } else {
      if (this.documentFormatterRegistration) {
        this.documentFormatterRegistration.dispose();
      }
    }
  }

  private setupFileChangeListeners() {
    this.documentService.onDidChangeContent((change: TextDocumentChangeEvent) => {
      this.triggerValidation(change.document);
    });
    this.documentService.onDidClose(e => {
      this.removeDocument(e.document);
      this.lspConnection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
    });
    this.lspConnection.onDidChangeWatchedFiles(({ changes }) => {
      const jsMode = this.languageModes.getMode('javascript');
      if (!jsMode) {
        throw Error(`Can't find JS mode.`);
      }

      changes.forEach(c => {
        if (c.type === FileChangeType.Changed) {
          const fsPath = getFileFsPath(c.uri);
          jsMode.onDocumentChanged!(fsPath);
        }
      });

      this.documentService.getAllDocuments().forEach(d => {
        this.triggerValidation(d);
      });
    });
  }

  configure(config: VLSConfig): void {
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

    logger.setLevel(config.vetur.dev.logLevel);
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
    const doc = this.documentService.getDocument(textDocument.uri)!;

    const modeRanges = this.languageModes.getAllLanguageModeRangesInDocument(doc);
    const allEdits: TextEdit[] = [];

    const errMessages: string[] = [];

    modeRanges.forEach(modeRange => {
      if (modeRange.mode && modeRange.mode.format) {
        try {
          const edits = modeRange.mode.format(doc, this.toSimpleRange(modeRange), options);
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

  private toSimpleRange(modeRange: LanguageModeRange): Range {
    return {
      start: modeRange.start,
      end: modeRange.end
    };
  }

  onCompletion({ textDocument, position }: TextDocumentPositionParams): CompletionList {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.doComplete) {
      return mode.doComplete(doc, position);
    }

    return NULL_COMPLETION;
  }

  onCompletionResolve(item: CompletionItem): CompletionItem {
    if (item.data) {
      const uri: string = item.data.uri;
      const languageId: LanguageId = item.data.languageId;

      /**
       * Template files need to go through HTML-template service
       */
      if (uri.endsWith('.template')) {
        const doc = this.documentService.getDocument(uri.slice(0, -'.template'.length));
        const mode = this.languageModes.getMode(languageId);
        if (doc && mode && mode.doResolve) {
          return mode.doResolve(doc, item);
        }
      }

      if (uri && languageId) {
        const doc = this.documentService.getDocument(uri);
        const mode = this.languageModes.getMode(languageId);
        if (doc && mode && mode.doResolve) {
          return mode.doResolve(doc, item);
        }
      }
    }

    return item;
  }

  onHover({ textDocument, position }: TextDocumentPositionParams): Hover {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.doHover) {
      return mode.doHover(doc, position);
    }
    return NULL_HOVER;
  }

  onDocumentHighlight({ textDocument, position }: TextDocumentPositionParams): DocumentHighlight[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.findDocumentHighlight) {
      return mode.findDocumentHighlight(doc, position);
    }
    return [];
  }

  onDefinition({ textDocument, position }: TextDocumentPositionParams): Definition {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.findDefinition) {
      return mode.findDefinition(doc, position);
    }
    return [];
  }

  onReferences({ textDocument, position }: TextDocumentPositionParams): Location[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.findReferences) {
      return mode.findReferences(doc, position);
    }
    return [];
  }

  onDocumentLinks({ textDocument }: DocumentLinkParams): DocumentLink[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const documentContext: DocumentContext = {
      resolveReference: ref => {
        if (this.workspacePath && ref[0] === '/') {
          return Uri.file(path.resolve(this.workspacePath, ref)).toString();
        }
        const fsPath = getFileFsPath(doc.uri);
        return Uri.file(path.resolve(fsPath, '..', ref)).toString();
      }
    };

    const links: DocumentLink[] = [];
    this.languageModes.getAllLanguageModeRangesInDocument(doc).forEach(m => {
      if (m.mode.findDocumentLinks) {
        pushAll(links, m.mode.findDocumentLinks(doc, documentContext));
      }
    });
    return links;
  }

  onDocumentSymbol({ textDocument }: DocumentSymbolParams): SymbolInformation[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const symbols: SymbolInformation[] = [];

    this.languageModes.getAllLanguageModeRangesInDocument(doc).forEach(m => {
      if (m.mode.findDocumentSymbols) {
        pushAll(symbols, m.mode.findDocumentSymbols(doc));
      }
    });
    return symbols;
  }

  onDocumentColors({ textDocument }: DocumentColorParams): ColorInformation[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const colors: ColorInformation[] = [];

    const distinctModes: Set<LanguageMode> = new Set();
    this.languageModes.getAllLanguageModeRangesInDocument(doc).forEach(m => {
      distinctModes.add(m.mode);
    });

    for (const mode of distinctModes) {
      if (mode.findDocumentColors) {
        pushAll(colors, mode.findDocumentColors(doc));
      }
    }

    return colors;
  }

  onColorPresentations({ textDocument, color, range }: ColorPresentationParams): ColorPresentation[] {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, range.start);
    if (mode && mode.getColorPresentations) {
      return mode.getColorPresentations(doc, color, range);
    }
    return [];
  }

  onSignatureHelp({ textDocument, position }: TextDocumentPositionParams): SignatureHelp | null {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, position);
    if (mode && mode.doSignatureHelp) {
      return mode.doSignatureHelp(doc, position);
    }
    return NULL_SIGNATURE;
  }

  onCodeAction({ textDocument, range, context }: CodeActionParams) {
    const doc = this.documentService.getDocument(textDocument.uri)!;
    const mode = this.languageModes.getModeAtPosition(doc, range.start);
    if (this.languageModes.getModeAtPosition(doc, range.end) !== mode) {
      return [];
    }
    if (mode && mode.getCodeActions) {
      return mode.getCodeActions(doc, range, /*formatParams*/ {} as any, context);
    }
    return [];
  }

  getRefactorEdits(refactorAction: RefactorAction) {
    const uri = Uri.file(refactorAction.fileName).toString();
    const doc = this.documentService.getDocument(uri)!;
    const startPos = doc.positionAt(refactorAction.textRange.pos);
    const mode = this.languageModes.getModeAtPosition(doc, startPos);
    if (mode && mode.getRefactorEdits) {
      return mode.getRefactorEdits(doc, refactorAction);
    }
    return undefined;
  }

  private triggerValidation(textDocument: TextDocument): void {
    this.cleanPendingValidation(textDocument);
    this.pendingValidationRequests[textDocument.uri] = setTimeout(() => {
      delete this.pendingValidationRequests[textDocument.uri];
      this.validateTextDocument(textDocument);
    }, this.validationDelayMs);
  }

  cleanPendingValidation(textDocument: TextDocument): void {
    const request = this.pendingValidationRequests[textDocument.uri];
    if (request) {
      clearTimeout(request);
      delete this.pendingValidationRequests[textDocument.uri];
    }
  }

  validateTextDocument(textDocument: TextDocument): void {
    const diagnostics: Diagnostic[] = this.doValidate(textDocument);
    this.lspConnection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }

  doValidate(doc: TextDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (doc.languageId === 'vue') {
      this.languageModes.getAllLanguageModeRangesInDocument(doc).forEach(lmr => {
        if (lmr.mode.doValidation && this.validation[lmr.mode.getId()]) {
          pushAll(diagnostics, lmr.mode.doValidation(doc));
        }
      });
    }
    return diagnostics;
  }

  removeDocument(doc: TextDocument): void {
    this.languageModes.onDocumentRemoved(doc);
  }

  dispose(): void {
    this.languageModes.dispose();
  }

  get capabilities(): ServerCapabilities {
    return {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: { resolveProvider: true, triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '*'] },
      signatureHelpProvider: { triggerCharacters: ['('] },
      documentFormattingProvider: false,
      hoverProvider: true,
      documentHighlightProvider: true,
      documentLinkProvider: {
        resolveProvider: false
      },
      documentSymbolProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      codeActionProvider: true,
      colorProvider: true
    };
  }
}

function pushAll<T>(to: T[], from: T[]) {
  if (from) {
    for (let i = 0; i < from.length; i++) {
      to.push(from[i]);
    }
  }
}
