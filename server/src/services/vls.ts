import path from 'path';
import {
  getFileFsPath,
  getFsPathToUri,
  getPathDepth,
  normalizeFileNameToFsPath,
  normalizeFileNameResolve
} from '../utils/paths';

import {
  DidChangeConfigurationParams,
  DocumentColorParams,
  DocumentFormattingParams,
  DocumentLinkParams,
  FileChangeType,
  Connection,
  TextDocumentPositionParams,
  ColorPresentationParams,
  InitializeParams,
  ServerCapabilities,
  TextDocumentSyncKind,
  DocumentFormattingRequest,
  Disposable,
  DocumentSymbolParams,
  CodeActionParams,
  CompletionParams,
  ExecuteCommandParams,
  ApplyWorkspaceEditRequest,
  FoldingRangeParams
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
  TextEdit,
  ColorPresentation,
  FoldingRange,
  DocumentUri
} from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { URI } from 'vscode-uri';
import { LanguageModes, LanguageModeRange, LanguageMode } from '../embeddedSupport/languageModes';
import { NULL_COMPLETION, NULL_HOVER, NULL_SIGNATURE } from '../modes/nullMode';
import { VueInfoService } from './vueInfoService';
import { createDependencyService, DependencyService } from './dependencyService';
import _ from 'lodash';
import { DocumentContext, RefactorAction } from '../types';
import { DocumentService } from './documentService';
import { VueHTMLMode } from '../modes/template';
import { logger } from '../log';
import { getDefaultVLSConfig, VLSFullConfig, VLSConfig, getVeturFullConfig, VeturFullConfig } from '../config';
import { LanguageId } from '../embeddedSupport/embeddedSupport';
import { APPLY_REFACTOR_COMMAND } from '../modes/script/javascript';
import { VCancellationToken, VCancellationTokenSource } from '../utils/cancellationToken';
import { findConfigFile } from '../utils/workspace';
import { createProjectService, ProjectService } from './projectService';

export class VLS {
  // @Todo: Remove this and DocumentContext
  private workspacePath: string | undefined;
  private veturConfig: VeturFullConfig;
  private documentService: DocumentService;
  private rootPathForConfig: string;
  private globalSnippetDir: string;
  private projects: Map<string, ProjectService>;
  private dependencyService: DependencyService;

  private pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
  private cancellationTokenValidationRequests: { [uri: string]: VCancellationTokenSource } = {};
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
  private templateInterpolationValidation = false;

  private documentFormatterRegistration: Disposable | undefined;

  private config: VLSFullConfig;

  constructor(private lspConnection: Connection) {
    this.documentService = new DocumentService(this.lspConnection);
    this.dependencyService = createDependencyService();
  }

  async init(params: InitializeParams) {
    const workspacePath = params.rootPath;
    if (!workspacePath) {
      console.error('No workspace path found. Vetur initialization failed.');
      return {
        capabilities: {}
      };
    }

    this.workspacePath = normalizeFileNameToFsPath(workspacePath);

    this.globalSnippetDir = params.initializationOptions?.globalSnippetDir;
    const veturConfigPath = findConfigFile(this.workspacePath, 'vetur.config.js');
    this.rootPathForConfig = normalizeFileNameToFsPath(veturConfigPath ? path.dirname(veturConfigPath) : workspacePath);
    this.veturConfig = await getVeturFullConfig(
      this.rootPathForConfig,
      this.workspacePath,
      veturConfigPath ? require(veturConfigPath) : {}
    );
    const config = this.getFullConfig(params.initializationOptions?.config);

    await this.dependencyService.init(
      this.rootPathForConfig,
      this.workspacePath,
      config.vetur.useWorkspaceDependencies,
      config.typescript.tsdk
    );
    this.projects = new Map();

    this.configure(config);
    this.setupConfigListeners();
    this.setupLSPHandlers();
    this.setupCustomLSPHandlers();
    this.setupFileChangeListeners();

    this.lspConnection.onShutdown(() => {
      this.dispose();
    });
  }

  listen() {
    this.lspConnection.listen();
  }

  private getFullConfig(config: any | undefined): VLSFullConfig {
    const result = config ? _.merge(getDefaultVLSConfig(), config) : getDefaultVLSConfig();
    Object.keys(this.veturConfig.settings).forEach(key => {
      _.set(result, key, this.veturConfig.settings[key]);
    });
    return result;
  }

  private setupConfigListeners() {
    this.lspConnection.onDidChangeConfiguration(async ({ settings }: DidChangeConfigurationParams) => {
      const config = this.getFullConfig(settings);
      this.configure(config);
      this.setupDynamicFormatters(config);
    });

    this.documentService.getAllDocuments().forEach(this.triggerValidation);
  }

  private async getProjectService(uri: DocumentUri): Promise<ProjectService | undefined> {
    const projectRootPaths = this.veturConfig.projects
      .map(project => ({
        rootFsPath: normalizeFileNameResolve(this.rootPathForConfig, project.root),
        tsconfigPath: project.tsconfig,
        packagePath: project.package,
        snippetFolder: project.snippetFolder,
        globalComponents: project.globalComponents
      }))
      .sort((a, b) => getPathDepth(b.rootFsPath, '/') - getPathDepth(a.rootFsPath, '/'));
    const docFsPath = getFileFsPath(uri);
    const projectConfig = projectRootPaths.find(projectConfig => docFsPath.startsWith(projectConfig.rootFsPath));
    if (!projectConfig) {
      return undefined;
    }
    if (this.projects.has(projectConfig.rootFsPath)) {
      return this.projects.get(projectConfig.rootFsPath);
    }

    const project = await createProjectService(
      this.rootPathForConfig,
      this.workspacePath ?? this.rootPathForConfig,
      projectConfig.rootFsPath,
      projectConfig.tsconfigPath,
      projectConfig.packagePath,
      projectConfig.snippetFolder,
      projectConfig.globalComponents,
      this.documentService,
      this.config,
      this.globalSnippetDir,
      this.dependencyService
    );
    this.projects.set(projectConfig.rootFsPath, project);
    return project;
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
    this.lspConnection.onFoldingRanges(this.onFoldingRanges.bind(this));
    this.lspConnection.onCodeAction(this.onCodeAction.bind(this));

    this.lspConnection.onDocumentColor(this.onDocumentColors.bind(this));
    this.lspConnection.onColorPresentation(this.onColorPresentations.bind(this));

    this.lspConnection.onExecuteCommand(this.executeCommand.bind(this));
  }

  private setupCustomLSPHandlers() {
    this.lspConnection.onRequest('$/queryVirtualFileInfo', async ({ fileName, currFileText }) => {
      const project = await this.getProjectService(getFsPathToUri(fileName));
      return (project?.languageModes.getMode('vue-html') as VueHTMLMode).queryVirtualFileInfo(fileName, currFileText);
    });

    this.lspConnection.onRequest('$/getDiagnostics', async params => {
      const doc = this.documentService.getDocument(params.uri);
      if (doc) {
        const diagnostics = await this.doValidate(doc);
        return diagnostics ?? [];
      }
      return [];
    });
  }

  private async setupDynamicFormatters(settings: VLSFullConfig) {
    if (settings.vetur.format.enable) {
      if (!this.documentFormatterRegistration) {
        this.documentFormatterRegistration = await this.lspConnection.client.register(DocumentFormattingRequest.type, {
          documentSelector: [{ language: 'vue' }]
        });
      }
    } else {
      if (this.documentFormatterRegistration) {
        this.documentFormatterRegistration.dispose();
      }
    }
  }

  private setupFileChangeListeners() {
    this.documentService.onDidChangeContent(change => {
      this.triggerValidation(change.document);
    });
    this.documentService.onDidClose(e => {
      this.removeDocument(e.document);
      this.lspConnection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
    });
    this.lspConnection.onDidChangeWatchedFiles(({ changes }) => {
      changes.forEach(async c => {
        if (c.type === FileChangeType.Changed) {
          const project = await this.getProjectService(c.uri);
          const jsMode = project?.languageModes.getMode('javascript');
          const fsPath = getFileFsPath(c.uri);
          jsMode?.onDocumentChanged!(fsPath);
        }
      });

      this.documentService.getAllDocuments().forEach(d => {
        this.triggerValidation(d);
      });
    });
  }

  configure(config: VLSConfig): void {
    this.config = config;

    const veturValidationOptions = config.vetur.validation;
    this.validation['vue-html'] = veturValidationOptions.template;
    this.validation.css = veturValidationOptions.style;
    this.validation.postcss = veturValidationOptions.style;
    this.validation.scss = veturValidationOptions.style;
    this.validation.less = veturValidationOptions.style;
    this.validation.javascript = veturValidationOptions.script;

    this.templateInterpolationValidation = config.vetur.experimental.templateInterpolationService;

    this.projects.forEach(project => {
      project.configure(config);
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

  async onDocumentFormatting(params: DocumentFormattingParams): Promise<TextEdit[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDocumentFormatting(params) ?? [];
  }

  async onCompletion(params: CompletionParams): Promise<CompletionList> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onCompletion(params) ?? NULL_COMPLETION;
  }

  async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    const project = await this.getProjectService(item.data.uri);

    return project?.onCompletionResolve(item) ?? item;
  }

  async onHover(params: TextDocumentPositionParams): Promise<Hover> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onHover(params) ?? NULL_HOVER;
  }

  async onDocumentHighlight(params: TextDocumentPositionParams): Promise<DocumentHighlight[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDocumentHighlight(params) ?? [];
  }

  async onDefinition(params: TextDocumentPositionParams): Promise<Definition> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDefinition(params) ?? [];
  }

  async onReferences(params: TextDocumentPositionParams): Promise<Location[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onReferences(params) ?? [];
  }

  async onDocumentLinks(params: DocumentLinkParams): Promise<DocumentLink[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDocumentLinks(params) ?? [];
  }

  async onDocumentSymbol(params: DocumentSymbolParams): Promise<SymbolInformation[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDocumentSymbol(params) ?? [];
  }

  async onDocumentColors(params: DocumentColorParams): Promise<ColorInformation[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onDocumentColors(params) ?? [];
  }

  async onColorPresentations(params: ColorPresentationParams): Promise<ColorPresentation[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onColorPresentations(params) ?? [];
  }

  async onSignatureHelp(params: TextDocumentPositionParams): Promise<SignatureHelp | null> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onSignatureHelp(params) ?? NULL_SIGNATURE;
  }

  async onFoldingRanges(params: FoldingRangeParams): Promise<FoldingRange[]> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onFoldingRanges(params) ?? [];
  }

  async onCodeAction(params: CodeActionParams) {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onCodeAction(params) ?? [];
  }

  async getRefactorEdits(refactorAction: RefactorAction) {
    const project = await this.getProjectService(URI.file(refactorAction.fileName).toString());

    return project?.getRefactorEdits(refactorAction) ?? undefined;
  }

  private triggerValidation(textDocument: TextDocument): void {
    if (textDocument.uri.includes('node_modules')) {
      return;
    }

    this.cleanPendingValidation(textDocument);
    this.cancelPastValidation(textDocument);
    this.pendingValidationRequests[textDocument.uri] = setTimeout(() => {
      delete this.pendingValidationRequests[textDocument.uri];
      const tsDep = this.dependencyService.get('typescript');
      this.cancellationTokenValidationRequests[textDocument.uri] = new VCancellationTokenSource(tsDep.module);
      this.validateTextDocument(textDocument, this.cancellationTokenValidationRequests[textDocument.uri].token);
    }, this.validationDelayMs);
  }

  cancelPastValidation(textDocument: TextDocument): void {
    const source = this.cancellationTokenValidationRequests[textDocument.uri];
    if (source) {
      source.cancel();
      source.dispose();
      delete this.cancellationTokenValidationRequests[textDocument.uri];
    }
  }

  cleanPendingValidation(textDocument: TextDocument): void {
    const request = this.pendingValidationRequests[textDocument.uri];
    if (request) {
      clearTimeout(request);
      delete this.pendingValidationRequests[textDocument.uri];
    }
  }

  async validateTextDocument(textDocument: TextDocument, cancellationToken?: VCancellationToken) {
    const diagnostics = await this.doValidate(textDocument, cancellationToken);
    if (diagnostics) {
      this.lspConnection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
  }

  async doValidate(doc: TextDocument, cancellationToken?: VCancellationToken) {
    const project = await this.getProjectService(doc.uri);

    return project?.doValidate(doc, cancellationToken) ?? null;
  }

  async executeCommand(arg: ExecuteCommandParams) {
    if (arg.command === APPLY_REFACTOR_COMMAND && arg.arguments) {
      const edit = this.getRefactorEdits(arg.arguments[0] as RefactorAction);
      if (edit) {
        // @ts-expect-error
        this.lspConnection.sendRequest(ApplyWorkspaceEditRequest.type, { edit });
      }
      return;
    }

    logger.logInfo(`Unknown command ${arg.command}.`);
  }

  async removeDocument(doc: TextDocument): Promise<void> {
    const project = await this.getProjectService(doc.uri);
    project?.languageModes.onDocumentRemoved(doc);
  }

  dispose(): void {
    this.projects.forEach(project => {
      project.dispose();
    });
  }

  get capabilities(): ServerCapabilities {
    return {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true, triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '*', ' '] },
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
      colorProvider: true,
      executeCommandProvider: {
        commands: [APPLY_REFACTOR_COMMAND]
      },
      foldingRangeProvider: true
    };
  }
}
