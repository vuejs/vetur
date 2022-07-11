// tslint:disable
/* auto generator by `generate-index ./src/` */
export type {
  VLSFormatConfig,
  VLSConfig,
  VLSFullConfig,
  BasicComponentInfo,
  Glob,
  VeturProject,
  VeturFullConfig,
  VeturConfig
} from './config';
export { getDefaultVLSConfig, getVeturFullConfig } from './config';
export { logger } from './log';
export type {
  DocumentContext,
  BaseCodeActionData,
  RefactorActionData,
  CombinedFixActionData,
  OrganizeImportsActionData,
  CodeActionData,
  SemanticTokenData,
  SemanticTokenOffsetData
} from './types';
export { CodeActionDataKind } from './types';
export type { LanguageId, LanguageRange, VueDocumentRegions } from './embeddedSupport/embeddedSupport';
export {
  getVueDocumentRegions,
  getSingleLanguageDocument,
  getSingleTypeDocument,
  getLanguageRangesOfType
} from './embeddedSupport/embeddedSupport';
export type { LanguageModelCache } from './embeddedSupport/languageModelCache';
export { getLanguageModelCache } from './embeddedSupport/languageModelCache';
export type { VLSServices, LanguageMode, LanguageModeRange } from './embeddedSupport/languageModes';
export { LanguageModes } from './embeddedSupport/languageModes';
export type { RegionType, EmbeddedRegion } from './embeddedSupport/vueDocumentRegionParser';
export { parseVueDocumentRegions } from './embeddedSupport/vueDocumentRegionParser';
export { NULL_HOVER, NULL_SIGNATURE, NULL_COMPLETION, nullMode } from './modes/nullMode';
export type { EnvironmentService } from './services/EnvironmentService';
export { createEnvironmentService } from './services/EnvironmentService';
export type { RefTokensService } from './services/RefTokenService';
export { createRefTokensService } from './services/RefTokenService';
export type { RuntimeLibrary, DependencyService } from './services/dependencyService';
export { createNodeModulesPaths, createDependencyService } from './services/dependencyService';
export { DocumentService } from './services/documentService';
export type { ProjectService } from './services/projectService';
export { createProjectService } from './services/projectService';
export { VLS } from './services/vls';
export type {
  VueFileInfo,
  ComponentInfo,
  ChildComponent,
  EmitInfo,
  PropInfo,
  DataInfo,
  ComputedInfo,
  MethodInfo
} from './services/vueInfoService';
export { VueInfoService } from './services/vueInfoService';
export type { VCancellationToken } from './utils/cancellationToken';
export { isVCancellationRequested, VCancellationTokenSource } from './utils/cancellationToken';
export {
  getFileFsPath,
  getFilePath,
  normalizeFileNameToFsPath,
  normalizeFileNameResolve,
  getPathDepth,
  getFsPathToUri,
  normalizeAbsolutePath
} from './utils/paths';
export { sleep } from './utils/sleep';
export {
  getWordAtText,
  removeQuotes,
  indentSection,
  toMarkupContent,
  modulePathToValidIdentifier
} from './utils/strings';
export { getVueVersionKey, inferVueVersion, VueVersion } from './utils/vueVersion';
export { findConfigFile, requireUncached } from './utils/workspace';
export type { AutoImportSfcPlugin } from './modes/plugins/autoImportSfcPlugin';
export { createAutoImportSfcPlugin } from './modes/plugins/autoImportSfcPlugin';
export { getPugMode } from './modes/pug/index';
export { findTokenAtPosition, locToRange } from './modes/pug/languageService';
export type { TSCodeActionKind } from './modes/script/CodeActionKindConverter';
export { getCodeActionKind } from './modes/script/CodeActionKindConverter';
export type { InternalChildComponent } from './modes/script/childComponents';
export { analyzeComponentsDefine } from './modes/script/childComponents';
export {
  getComponentInfo,
  analyzeDefaultExportExpr,
  getDefaultExportNode,
  getLastChild,
  isClassType,
  getClassDecoratorArgumentType,
  buildDocumentation
} from './modes/script/componentInfo';
export { getGlobalComponents } from './modes/script/globalComponents';
export { getJavascriptMode, languageServiceIncludesFile, getFormatCodeSettings } from './modes/script/javascript';
export { getTagDocumentation, plain } from './modes/script/previewer';
export {
  getSemanticTokenLegends,
  getTokenTypeFromClassification,
  getTokenModifierFromClassification,
  addCompositionApiRefTokens,
  TsTokenType,
  TokenModifier
} from './modes/script/semanticToken';
export { StylePriority } from './modes/style/emmet';
export { getCSSMode, getPostCSSMode, getSCSSMode, getLESSMode } from './modes/style/index';
export { HTMLMode } from './modes/template/htmlMode';
export { VueHTMLMode } from './modes/template/index';
export { VueInterpolationMode } from './modes/template/interpolationMode';
export type { Modifier } from './modes/template/modifierProvider';
export { getModifierProvider } from './modes/template/modifierProvider';
export { getTagDefinition } from './modes/template-common/tagDefinition';
export type { CompletionTestSetup } from './modes/test-util/completion-test-util';
export { testDSL, CompletionAsserter } from './modes/test-util/completion-test-util';
export type { HoverTestSetup } from './modes/test-util/hover-test-util';
export { hoverDSL, HoverAsserter } from './modes/test-util/hover-test-util';
export { getVueMode } from './modes/vue/index';
export type { ScaffoldSnippetSources } from './modes/vue/snippets';
export { SnippetManager } from './modes/vue/snippets';
export { moduleName, fileName, preVue25Content, vue25Content, vue30Content } from './services/typescriptService/bridge';
export { ModuleResolutionCache } from './services/typescriptService/moduleResolutionCache';
export {
  parseVueScript,
  parseVueTemplate,
  createUpdater,
  injectVueTemplate
} from './services/typescriptService/preprocess';
export type { IServiceHost } from './services/typescriptService/serviceHost';
export { getServiceHost, templateSourceMap } from './services/typescriptService/serviceHost';
export type { TemplateSourceMapNode, TemplateSourceMap } from './services/typescriptService/sourceMap';
export {
  generateSourceMap,
  mapFromPositionToOffset,
  mapToRange,
  mapBackRange,
  printSourceMap,
  stringifySourceMapNodes
} from './services/typescriptService/sourceMap';
export { createTemplateDiagnosticFilter } from './services/typescriptService/templateDiagnosticFilter';
export {
  getTemplateTransformFunctions,
  renderHelperName,
  componentHelperName,
  iterationHelperName,
  componentDataName,
  globalScope
} from './services/typescriptService/transformTemplate';
export {
  isVueFile,
  isVirtualVueFile,
  isVirtualVueTemplateFile,
  findNodeByOffset,
  toCompletionItemKind,
  toSymbolKind
} from './services/typescriptService/util';
export { getVueSys } from './services/typescriptService/vueSys';
export { walkExpression } from './services/typescriptService/walkExpression';
export { prettierify, prettierEslintify, prettierTslintify, prettierPluginPugify } from './utils/prettier/index';
export { SassLanguageMode } from './modes/style/sass/sassLanguageMode';
export { default as builtIn } from './modes/style/stylus/built-in';
export {
  isClassOrId,
  isAtRule,
  isValue,
  getPropertyName,
  findPropertySchema,
  getAllSymbols,
  getAtRules,
  getProperties,
  getValues,
  provideCompletionItems
} from './modes/style/stylus/completion-item';
export type { LoadedCSSData } from './modes/style/stylus/css-browser-data';
export { cssData } from './modes/style/stylus/css-browser-data';
export { default as cssColors } from './modes/style/stylus/css-colors-list';
export { getStylusMode, wordPattern } from './modes/style/stylus/index';
export type { StylusNode } from './modes/style/stylus/parser';
export {
  isVariableNode,
  isFunctionNode,
  isSelectorNode,
  isSelectorCallNode,
  isAtRuleNode,
  isColor,
  buildAst,
  flattenAndFilterAst,
  findNodeAtPosition
} from './modes/style/stylus/parser';
export { stylusHover } from './modes/style/stylus/stylus-hover';
export type { IStylusSupremacy } from './modes/style/stylus/stylus-supremacy';
export { provideDocumentSymbols } from './modes/style/stylus/symbols-finder';
export type { HTMLDocument } from './modes/template/parser/htmlParser';
export { parse, parseHTMLDocument, Node } from './modes/template/parser/htmlParser';
export type { Scanner } from './modes/template/parser/htmlScanner';
export { createScanner, HtmlTokenType, ScannerState } from './modes/template/parser/htmlScanner';
export { doComplete, normalizeAttributeNameToKebabCase } from './modes/template/services/htmlCompletion';
export { findDefinition } from './modes/template/services/htmlDefinition';
export { doESLintValidation, createLintEngine } from './modes/template/services/htmlEslintValidation';
export { getFoldingRanges } from './modes/template/services/htmlFolding';
export { htmlFormat } from './modes/template/services/htmlFormat';
export { findDocumentHighlights } from './modes/template/services/htmlHighlighting';
export { doHover } from './modes/template/services/htmlHover';
export { findDocumentLinks } from './modes/template/services/htmlLinks';
export { findDocumentSymbols } from './modes/template/services/htmlSymbolsProvider';
export { isInsideInterpolation } from './modes/template/services/isInsideInterpolation';
export { doPropValidation } from './modes/template/services/vuePropValidation';
export type {
  Attribute,
  AttributeCollector,
  IHTMLTagProvider,
  ITagSet,
  IValueSets
} from './modes/template/tagProviders/common';
export {
  getSameTagInSet,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  TagProviderPriority,
  HTMLTagSpecification
} from './modes/template/tagProviders/common';
export { getComponentInfoTagProvider } from './modes/template/tagProviders/componentInfoTagProvider';
export {
  getWorkspaceTagProvider,
  getDependencyTagProvider,
  getExternalTagProvider,
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  gridsomeTagProvider
} from './modes/template/tagProviders/externalTagProviders';
export { isVoidElement, getHTML5TagProvider, VOID_ELEMENTS, HTML_TAGS } from './modes/template/tagProviders/htmlTags';
export type { CompletionConfiguration } from './modes/template/tagProviders/index';
export { getTagProviderSettings, getEnabledTagProviders, allTagProviders } from './modes/template/tagProviders/index';
export { getNuxtTagProvider } from './modes/template/tagProviders/nuxtTags';
export { getRouterTagProvider } from './modes/template/tagProviders/routerTags';
export { getVueTagProvider } from './modes/template/tagProviders/vueTags';
/* auto generator end */
