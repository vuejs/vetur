import { FormattingOptions, Position, Range, Hover, Location, CompletionItem } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { VueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { LanguageModelCache, getLanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { VueInfoService } from '../../services/vueInfoService';
import { DocumentContext } from '../../types';
import { HTMLMode } from './htmlMode';
import { VueInterpolationMode } from './interpolationMode';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { HTMLDocument, parseHTMLDocument } from './parser/htmlParser';
import { inferVueVersion } from '../../services/typescriptService/vueVersion';
import { DependencyService, RuntimeLibrary } from '../../services/dependencyService';
import { VCancellationToken } from '../../utils/cancellationToken';
import { AutoImportVueService } from '../../services/autoImportVueService';

type DocumentRegionCache = LanguageModelCache<VueDocumentRegions>;

export class VueHTMLMode implements LanguageMode {
  private htmlMode: HTMLMode;
  private vueInterpolationMode: VueInterpolationMode;
  private autoImportVueService: AutoImportVueService;

  constructor(
    tsModule: RuntimeLibrary['typescript'],
    serviceHost: IServiceHost,
    documentRegions: DocumentRegionCache,
    workspacePath: string,
    autoImportVueService: AutoImportVueService,
    dependencyService: DependencyService,
    vueInfoService?: VueInfoService
  ) {
    const vueDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => parseHTMLDocument(document));
    const vueVersion = inferVueVersion(workspacePath);
    this.htmlMode = new HTMLMode(
      documentRegions,
      workspacePath,
      vueVersion,
      dependencyService,
      vueDocuments,
      autoImportVueService,
      vueInfoService
    );
    this.vueInterpolationMode = new VueInterpolationMode(tsModule, serviceHost, vueDocuments, vueInfoService);
    this.autoImportVueService = autoImportVueService;
  }
  getId() {
    return 'vue-html';
  }
  configure(c: any) {
    this.htmlMode.configure(c);
    this.vueInterpolationMode.configure(c);
  }
  queryVirtualFileInfo(fileName: string, currFileText: string) {
    return this.vueInterpolationMode.queryVirtualFileInfo(fileName, currFileText);
  }
  async doValidation(document: TextDocument, cancellationToken?: VCancellationToken) {
    return Promise.all([
      this.vueInterpolationMode.doValidation(document, cancellationToken),
      this.htmlMode.doValidation(document, cancellationToken)
    ]).then(result => [...result[0], ...result[1]]);
  }
  doComplete(document: TextDocument, position: Position) {
    const htmlList = this.htmlMode.doComplete(document, position);
    const intList = this.vueInterpolationMode.doComplete(document, position);
    return {
      isIncomplete: htmlList.isIncomplete || intList.isIncomplete,
      items: htmlList.items.concat(intList.items)
    };
  }
  doResolve(document: TextDocument, item: CompletionItem): CompletionItem {
    if (this.autoImportVueService.isMyResolve(item)) {
      return this.autoImportVueService.doResolve(document, item);
    }
    return this.vueInterpolationMode.doResolve(document, item);
  }
  doHover(document: TextDocument, position: Position): Hover {
    const interpolationHover = this.vueInterpolationMode.doHover(document, position);
    return interpolationHover.contents.length !== 0 ? interpolationHover : this.htmlMode.doHover(document, position);
  }
  findDocumentHighlight(document: TextDocument, position: Position) {
    return this.htmlMode.findDocumentHighlight(document, position);
  }
  findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
    return this.htmlMode.findDocumentLinks(document, documentContext);
  }
  findDocumentSymbols(document: TextDocument) {
    return this.htmlMode.findDocumentSymbols(document);
  }
  format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
    return this.htmlMode.format(document, range, formattingOptions);
  }
  findReferences(document: TextDocument, position: Position): Location[] {
    return this.vueInterpolationMode.findReferences(document, position);
  }
  findDefinition(document: TextDocument, position: Position) {
    const htmlDefinition = this.htmlMode.findDefinition(document, position);

    return htmlDefinition.length > 0 ? htmlDefinition : this.vueInterpolationMode.findDefinition(document, position);
  }
  getFoldingRanges(document: TextDocument) {
    return this.htmlMode.getFoldingRanges(document);
  }
  onDocumentRemoved(document: TextDocument) {
    this.htmlMode.onDocumentRemoved(document);
  }
  dispose() {
    this.htmlMode.dispose();
  }
}
