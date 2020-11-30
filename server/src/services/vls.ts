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
  FoldingRangeParams,
  DidChangeWorkspaceFoldersNotification
} from 'vscode-languageserver';
import {
  ColorInformation,
  CompletionItem,
  CompletionList,
  Definition,
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
import { NULL_COMPLETION, NULL_HOVER, NULL_SIGNATURE } from '../modes/nullMode';
import { createDependencyService, createNodeModulesPaths } from './dependencyService';
import _ from 'lodash';
import { RefactorAction } from '../types';
import { DocumentService } from './documentService';
import { VueHTMLMode } from '../modes/template';
import { logger } from '../log';
import { getDefaultVLSConfig, VLSFullConfig, getVeturFullConfig, VeturFullConfig } from '../config';
import { APPLY_REFACTOR_COMMAND } from '../modes/script/javascript';
import { VCancellationToken, VCancellationTokenSource } from '../utils/cancellationToken';
import { findConfigFile, requireUncached } from '../utils/workspace';
import { createProjectService, ProjectService } from './projectService';

export class VLS {
  private workspaces: Map<string, VeturFullConfig & { name: string; workspaceFsPath: string }>;
  private nodeModulesMap: Map<string, string[]>;
  private documentService: DocumentService;
  private globalSnippetDir: string;
  private projects: Map<string, ProjectService>;
  private pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
  private cancellationTokenValidationRequests: { [uri: string]: VCancellationTokenSource } = {};
  private validationDelayMs = 200;

  private documentFormatterRegistration: Disposable | undefined;

  private workspaceConfig: unknown;

  constructor(private lspConnection: Connection) {
    this.documentService = new DocumentService(this.lspConnection);
    this.workspaces = new Map();
    this.projects = new Map();
    this.nodeModulesMap = new Map();
  }

  async init(params: InitializeParams) {
    const workspaceFolders =
      !Array.isArray(params.workspaceFolders) && params.rootPath
        ? [{ name: '', fsPath: normalizeFileNameToFsPath(params.rootPath) }]
        : params.workspaceFolders?.map(el => ({ name: el.name, fsPath: getFileFsPath(el.uri) })) ?? [];

    if (workspaceFolders.length === 0) {
      console.error('No workspace path found. Vetur initialization failed.');
      return {
        capabilities: {}
      };
    }

    this.globalSnippetDir = params.initializationOptions?.globalSnippetDir;

    await Promise.all(workspaceFolders.map(workspace => this.addWorkspace(workspace)));

    this.workspaceConfig = this.getVLSFullConfig({}, params.initializationOptions?.config);

    if (params.capabilities.workspace?.workspaceFolders) {
      this.setupWorkspaceListeners();
    }
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

  private getVLSFullConfig(settings: VeturFullConfig['settings'], config: any | undefined): VLSFullConfig {
    const result = config ? _.merge(getDefaultVLSConfig(), config) : getDefaultVLSConfig();
    Object.keys(settings).forEach(key => {
      _.set(result, key, settings[key]);
    });
    return result;
  }

  private async addWorkspace(workspace: { name: string; fsPath: string }) {
    const veturConfigPath = findConfigFile(workspace.fsPath, 'vetur.config.js');
    const rootPathForConfig = normalizeFileNameToFsPath(
      veturConfigPath ? path.dirname(veturConfigPath) : workspace.fsPath
    );
    if (!this.workspaces.has(rootPathForConfig)) {
      this.workspaces.set(rootPathForConfig, {
        name: workspace.name,
        ...(await getVeturFullConfig(
          rootPathForConfig,
          workspace.fsPath,
          veturConfigPath ? requireUncached(veturConfigPath) : {}
        )),
        workspaceFsPath: workspace.fsPath
      });
    }
  }

  private setupWorkspaceListeners() {
    this.lspConnection.onInitialized(() => {
      this.lspConnection.workspace.onDidChangeWorkspaceFolders(async e => {
        await Promise.all(e.added.map(el => this.addWorkspace({ name: el.name, fsPath: getFileFsPath(el.uri) })));
      });
    });
  }

  private setupConfigListeners() {
    this.lspConnection.onDidChangeConfiguration(async ({ settings }: DidChangeConfigurationParams) => {
      let isFormatEnable = false;
      this.projects.forEach(project => {
        const veturConfig = this.workspaces.get(project.rootPathForConfig);
        if (!veturConfig) {
          return;
        }
        const fullConfig = this.getVLSFullConfig(veturConfig.settings, settings);
        project.configure(fullConfig);
        isFormatEnable = isFormatEnable || fullConfig.vetur.format.enable;
      });
      this.setupDynamicFormatters(isFormatEnable);
    });

    this.documentService.getAllDocuments().forEach(this.triggerValidation);
  }

  private async getProjectService(uri: DocumentUri): Promise<ProjectService | undefined> {
    const projectRootPaths = _.flatten(
      Array.from(this.workspaces.entries()).map(([rootPathForConfig, veturConfig]) =>
        veturConfig.projects.map(project => ({
          ...project,
          rootPathForConfig,
          vlsFullConfig: this.getVLSFullConfig(veturConfig.settings, this.workspaceConfig),
          workspaceFsPath: veturConfig.workspaceFsPath
        }))
      )
    )
      .map(project => ({
        vlsFullConfig: project.vlsFullConfig,
        rootPathForConfig: project.rootPathForConfig,
        workspaceFsPath: project.workspaceFsPath,
        rootFsPath: normalizeFileNameResolve(project.rootPathForConfig, project.root),
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

    const dependencyService = createDependencyService();
    const nodeModulePaths =
      this.nodeModulesMap.get(projectConfig.rootPathForConfig) ??
      createNodeModulesPaths(projectConfig.rootPathForConfig);
    if (this.nodeModulesMap.has(projectConfig.rootPathForConfig)) {
      this.nodeModulesMap.set(projectConfig.rootPathForConfig, nodeModulePaths);
    }
    await dependencyService.init(
      projectConfig.rootPathForConfig,
      projectConfig.workspaceFsPath,
      projectConfig.vlsFullConfig.vetur.useWorkspaceDependencies,
      nodeModulePaths,
      projectConfig.vlsFullConfig.typescript.tsdk
    );
    const project = await createProjectService(
      projectConfig.rootPathForConfig,
      projectConfig.rootFsPath,
      projectConfig.tsconfigPath,
      projectConfig.packagePath,
      projectConfig.snippetFolder,
      projectConfig.globalComponents,
      this.documentService,
      projectConfig.vlsFullConfig,
      this.globalSnippetDir,
      dependencyService
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

  private async setupDynamicFormatters(enable: boolean) {
    if (enable) {
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
          const fsPath = getFileFsPath(c.uri);
          if (this.workspaces.has(fsPath)) {
            const name = this.workspaces.get(fsPath)?.name ?? '';
            this.workspaces.delete(fsPath);
            await this.addWorkspace({ name, fsPath });
            this.projects.forEach((project, projectPath) => {
              if (project.rootPathForConfig === fsPath) {
                project.dispose();
                this.projects.delete(projectPath);
              }
            });
            return;
          }

          const project = await this.getProjectService(c.uri);
          const jsMode = project?.languageModes.getMode('javascript');
          jsMode?.onDocumentChanged!(fsPath);
        }
      });

      this.documentService.getAllDocuments().forEach(d => {
        this.triggerValidation(d);
      });
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
      this.cancellationTokenValidationRequests[textDocument.uri] = new VCancellationTokenSource();
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
      workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
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
