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
  FoldingRangeParams,
  RenameFilesParams,
  SemanticTokensParams,
  SemanticTokens,
  SemanticTokensRangeParams,
  SemanticTokensRequest,
  SemanticTokensRangeRequest
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
  DocumentUri,
  CodeAction,
  CodeActionKind,
  TextDocumentIdentifier
} from 'vscode-languageserver-types';
import type { Range, TextDocument } from 'vscode-languageserver-textdocument';

import { NULL_COMPLETION, NULL_HOVER, NULL_SIGNATURE } from '../modes/nullMode';
import { createDependencyService, createNodeModulesPaths } from './dependencyService';
import _ from 'lodash';
import { DocumentService } from './documentService';
import { VueHTMLMode } from '../modes/template';
import { logger } from '../log';
import { getDefaultVLSConfig, VLSFullConfig, getVeturFullConfig, VeturFullConfig, BasicComponentInfo } from '../config';
import { VCancellationToken, VCancellationTokenSource } from '../utils/cancellationToken';
import { findConfigFile, requireUncached } from '../utils/workspace';
import { createProjectService, ProjectService } from './projectService';
import { createEnvironmentService } from './EnvironmentService';
import { getVueVersionKey } from '../utils/vueVersion';
import { accessSync, constants, existsSync } from 'fs';
import { sleep } from '../utils/sleep';
import { URI } from 'vscode-uri';
import { getSemanticTokenLegends } from '../modes/script/semanticToken';
import { createRefTokensService } from './RefTokenService';

interface ProjectConfig {
  vlsFullConfig: VLSFullConfig;
  isExistVeturConfig: boolean;
  rootPathForConfig: string;
  workspaceFsPath: string;
  rootFsPath: string;
  tsconfigPath: string | undefined;
  packagePath: string | undefined;
  snippetFolder: string;
  globalComponents: BasicComponentInfo[];
}

export class VLS {
  private workspaces: Map<
    string,
    VeturFullConfig & { name: string; workspaceFsPath: string; isExistVeturConfig: boolean }
  >;
  private nodeModulesMap: Map<string, string[]>;
  private documentService: DocumentService;
  private globalSnippetDir: string;
  private loadingProjects: string[];
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
    this.loadingProjects = [];
  }

  async init(params: InitializeParams) {
    const workspaceFolders =
      Array.isArray(params.workspaceFolders) && params.capabilities.workspace?.workspaceFolders
        ? params.workspaceFolders.map(el => ({ name: el.name, fsPath: getFileFsPath(el.uri) }))
        : params.rootPath
        ? [{ name: '', fsPath: normalizeFileNameToFsPath(params.rootPath) }]
        : [];

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
    // Enable Yarn PnP support https://yarnpkg.com/features/pnp
    if (!process.versions.pnp) {
      if (existsSync(path.join(workspace.fsPath, '.pnp.js'))) {
        require(path.join(workspace.fsPath, '.pnp.js')).setup();
      } else if (existsSync(path.join(workspace.fsPath, '.pnp.cjs'))) {
        require(path.join(workspace.fsPath, '.pnp.cjs')).setup();
      }
    }

    let veturConfigPath = findConfigFile(workspace.fsPath, 'vetur.config.js');
    if (!veturConfigPath) {
      veturConfigPath = findConfigFile(workspace.fsPath, 'vetur.config.cjs');
    }
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
        isExistVeturConfig: !!veturConfigPath,
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
      this.workspaceConfig = this.getVLSFullConfig({}, settings);
      let isFormatEnable = (this.workspaceConfig as VLSFullConfig)?.vetur?.format?.enable ?? false;
      logger.setLevel((this.workspaceConfig as VLSFullConfig)?.vetur?.dev.logLevel);
      this.projects.forEach(project => {
        const veturConfig = this.workspaces.get(project.env.getRootPathForConfig());
        if (!veturConfig) {
          return;
        }
        const fullConfig = this.getVLSFullConfig(veturConfig.settings, this.workspaceConfig);
        project.env.configure(fullConfig);
        isFormatEnable = isFormatEnable || fullConfig.vetur.format.enable;
      });
      this.setupDynamicFormatters(isFormatEnable);
    });

    this.documentService.getAllDocuments().forEach(this.triggerValidation);
  }

  private getAllProjectConfigs(): ProjectConfig[] {
    return _.flatten(
      Array.from(this.workspaces.entries()).map(([rootPathForConfig, veturConfig]) =>
        veturConfig.projects.map(project => ({
          ...project,
          rootPathForConfig,
          vlsFullConfig: this.getVLSFullConfig(veturConfig.settings, this.workspaceConfig),
          workspaceFsPath: veturConfig.workspaceFsPath,
          isExistVeturConfig: veturConfig.isExistVeturConfig
        }))
      )
    )
      .map(project => ({
        vlsFullConfig: project.vlsFullConfig,
        isExistVeturConfig: project.isExistVeturConfig,
        rootPathForConfig: project.rootPathForConfig,
        workspaceFsPath: project.workspaceFsPath,
        rootFsPath: project.root,
        tsconfigPath: project.tsconfig,
        packagePath: project.package,
        snippetFolder: project.snippetFolder,
        globalComponents: project.globalComponents
      }))
      .sort((a, b) => getPathDepth(b.rootFsPath, '/') - getPathDepth(a.rootFsPath, '/'));
  }

  private warnProjectIfNeed(projectConfig: ProjectConfig) {
    if (projectConfig.vlsFullConfig.vetur.ignoreProjectWarning) {
      return;
    }

    const isFileCanAccess = (fsPath: string) => {
      try {
        accessSync(fsPath, constants.R_OK);
        return true;
      } catch {
        return false;
      }
    };
    const showErrorIfCantAccess = (name: string, fsPath: string) => {
      this.lspConnection.window.showErrorMessage(`Vetur can't access ${fsPath} for ${name}.`);
    };

    const showWarningAndLearnMore = (message: string, url: string) => {
      this.lspConnection.window.showWarningMessage(message, { title: 'Learn More' }).then(action => {
        if (action) {
          this.openWebsite(url);
        }
      });
    };

    const getCantFindMessage = (fileNames: string[]) =>
      `Vetur can't find ${fileNames.map(el => `\`${el}\``).join(' or ')} in ${projectConfig.rootFsPath}.`;
    if (!projectConfig.tsconfigPath) {
      showWarningAndLearnMore(
        getCantFindMessage(['tsconfig.json', 'jsconfig.json']),
        'https://vuejs.github.io/vetur/guide/FAQ.html#vetur-can-t-find-tsconfig-json-jsconfig-json-in-xxxx-xxxxxx'
      );
    } else if (!isFileCanAccess(projectConfig.tsconfigPath)) {
      showErrorIfCantAccess('ts/js config', projectConfig.tsconfigPath);
    } else {
      if (
        !projectConfig.isExistVeturConfig &&
        ![
          normalizeFileNameResolve(projectConfig.rootFsPath, 'tsconfig.json'),
          normalizeFileNameResolve(projectConfig.rootFsPath, 'jsconfig.json')
        ].includes(projectConfig.tsconfigPath ?? '')
      ) {
        showWarningAndLearnMore(
          `Vetur found \`tsconfig.json\`/\`jsconfig.json\`, but they aren\'t in the project root.`,
          'https://vuejs.github.io/vetur/guide/FAQ.html#vetur-found-xxx-but-they-aren-t-in-the-project-root'
        );
      }
    }

    if (!projectConfig.packagePath) {
      showWarningAndLearnMore(
        getCantFindMessage(['package.json']),
        'https://vuejs.github.io/vetur/guide/FAQ.html#vetur-can-t-find-package-json-in-xxxx-xxxxxx'
      );
    } else if (!isFileCanAccess(projectConfig.packagePath)) {
      showErrorIfCantAccess('ts/js config', projectConfig.packagePath);
    } else {
      if (
        !projectConfig.isExistVeturConfig &&
        normalizeFileNameResolve(projectConfig.rootFsPath, 'package.json') !== projectConfig.packagePath
      ) {
        showWarningAndLearnMore(
          `Vetur found \`package.json\`/, but it isn\'t in the project root.`,
          'https://vuejs.github.io/vetur/guide/FAQ.html#vetur-found-xxx-but-they-aren-t-in-the-project-root'
        );
      }
    }
  }

  getProjectRootPath(uri: DocumentUri): string | undefined {
    return this.getProjectConfig(uri)?.rootFsPath;
  }

  private getProjectConfig(uri: DocumentUri): ProjectConfig | undefined {
    const projectConfigs = this.getAllProjectConfigs();
    const docFsPath = getFileFsPath(uri);
    const projectConfig = projectConfigs.find(projectConfig => docFsPath.startsWith(projectConfig.rootFsPath));

    return projectConfig;
  }

  private async getProjectService(uri: DocumentUri): Promise<ProjectService | undefined> {
    const projectConfig = this.getProjectConfig(uri);
    if (!projectConfig) {
      return undefined;
    }
    if (this.projects.has(projectConfig.rootFsPath)) {
      return this.projects.get(projectConfig.rootFsPath);
    }
    // Load project once
    if (this.loadingProjects.includes(projectConfig.rootFsPath)) {
      while (!this.projects.has(projectConfig.rootFsPath)) {
        await sleep(500);
      }
      return this.projects.get(projectConfig.rootFsPath);
    }

    // init project
    // Yarn Pnp don't need this. https://yarnpkg.com/features/pnp
    this.loadingProjects.push(projectConfig.rootFsPath);
    const workDoneProgress = await this.lspConnection.window.createWorkDoneProgress();
    workDoneProgress.begin(`Load project: ${projectConfig.rootFsPath}`, undefined);
    const nodeModulePaths =
      this.nodeModulesMap.get(projectConfig.rootPathForConfig) ??
      createNodeModulesPaths(projectConfig.rootPathForConfig);
    if (this.nodeModulesMap.has(projectConfig.rootPathForConfig)) {
      this.nodeModulesMap.set(projectConfig.rootPathForConfig, nodeModulePaths);
    }
    const dependencyService = await createDependencyService(
      projectConfig.rootPathForConfig,
      projectConfig.workspaceFsPath,
      projectConfig.vlsFullConfig.vetur.useWorkspaceDependencies,
      nodeModulePaths,
      projectConfig.vlsFullConfig.typescript.tsdk
    );
    this.warnProjectIfNeed(projectConfig);
    const project = await createProjectService(
      createEnvironmentService(
        projectConfig.rootPathForConfig,
        projectConfig.rootFsPath,
        projectConfig.tsconfigPath,
        projectConfig.packagePath,
        projectConfig.snippetFolder,
        projectConfig.globalComponents,
        projectConfig.vlsFullConfig
      ),
      this.documentService,
      this.globalSnippetDir,
      dependencyService,
      createRefTokensService(this.lspConnection)
    );
    this.projects.set(projectConfig.rootFsPath, project);
    workDoneProgress.done();
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
    this.lspConnection.onCodeActionResolve(this.onCodeActionResolve.bind(this));
    this.lspConnection.workspace.onWillRenameFiles(this.onWillRenameFiles.bind(this));
    this.lspConnection.languages.semanticTokens.on(this.onSemanticToken.bind(this));
    this.lspConnection.languages.semanticTokens.onRange(this.onSemanticToken.bind(this));

    this.lspConnection.onDocumentColor(this.onDocumentColors.bind(this));
    this.lspConnection.onColorPresentation(this.onColorPresentations.bind(this));

    this.lspConnection.onExecuteCommand(this.executeCommand.bind(this));
  }

  private setupCustomLSPHandlers() {
    this.lspConnection.onRequest('$/doctor', async ({ fileName }) => {
      const uri = getFsPathToUri(fileName);
      const projectConfigs = this.getAllProjectConfigs();
      const project = await this.getProjectService(uri);

      return JSON.stringify(
        {
          name: 'Vetur doctor info',
          fileName,
          currentProject: {
            vueVersion: project ? getVueVersionKey(project?.env.getVueVersion()) : null,
            rootPathForConfig: project?.env.getRootPathForConfig() ?? null,
            projectRootFsPath: project?.env.getProjectRoot() ?? null
          },
          activeProjects: Array.from(this.projects.keys()),
          projectConfigs
        },
        null,
        2
      );
    });

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

          // when `vetur.config.js` changed
          if (this.workspaces.has(fsPath)) {
            logger.logInfo(`refresh vetur config when ${fsPath} changed.`);
            const name = this.workspaces.get(fsPath)?.name ?? '';
            this.workspaces.delete(fsPath);
            await this.addWorkspace({ name, fsPath });
            this.projects.forEach((project, projectRoot) => {
              if (project.env.getRootPathForConfig() === fsPath) {
                project.dispose();
                this.projects.delete(projectRoot);
              }
            });
            return;
          }

          const project = await this.getProjectService(c.uri);
          project?.languageModes.getAllModes().forEach(m => {
            if (m.onDocumentChanged) {
              m.onDocumentChanged(fsPath);
            }
          });
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
  openWebsite(url: string): void {
    this.lspConnection.window.showDocument({ uri: URI.parse(url).toString(), external: true });
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
    if (!item.data) {
      return item;
    }
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

  async onCodeActionResolve(action: CodeAction) {
    if (!action.data) {
      return action;
    }
    const project = await this.getProjectService((action.data as { uri: string })?.uri);

    return project?.onCodeActionResolve(action) ?? action;
  }

  async onWillRenameFiles({ files }: RenameFilesParams) {
    const inTheSameProject = files.filter(file => {
      const oldFileProject = this.getProjectRootPath(file.oldUri);
      const newFileProject = this.getProjectRootPath(file.newUri);

      return oldFileProject && newFileProject && oldFileProject === newFileProject;
    });

    const documentChanges = _.flatten(
      await Promise.all(
        inTheSameProject.map(async rename => {
          const projectService = await this.getProjectService(rename.newUri);

          return projectService?.onWillRenameFile(rename) ?? [];
        })
      )
    );

    if (!documentChanges.length) {
      return null;
    }

    return {
      documentChanges
    };
  }

  async onSemanticToken(params: SemanticTokensParams | SemanticTokensRangeParams): Promise<SemanticTokens> {
    const project = await this.getProjectService(params.textDocument.uri);

    return project?.onSemanticTokens(params) ?? { data: [] as number[] };
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
      workspace: {
        workspaceFolders: { supported: true, changeNotifications: true },
        fileOperations: { willRename: { filters: [{ pattern: { glob: '**/*.{ts,js,vue}' } }] } }
      },
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
      codeActionProvider: {
        codeActionKinds: [
          CodeActionKind.QuickFix,
          CodeActionKind.Refactor,
          CodeActionKind.RefactorExtract,
          CodeActionKind.RefactorInline,
          CodeActionKind.RefactorRewrite,
          CodeActionKind.Source,
          CodeActionKind.SourceOrganizeImports
        ],
        resolveProvider: true
      },
      colorProvider: true,
      executeCommandProvider: {
        commands: []
      },
      foldingRangeProvider: true,
      semanticTokensProvider: {
        range: true,
        full: true,
        legend: getSemanticTokenLegends()
      }
    };
  }
}
