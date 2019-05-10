import { FormattingOptions, Position, Range, TextDocument, Hover, Location } from 'vscode-languageserver-types';
import { VueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { LanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { VueInfoService } from '../../services/vueInfoService';
import { DocumentContext } from '../../types';
import { HTMLMode } from './htmlMode';
import { VueInterpolationMode } from './interpolationMode';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { T_TypeScript } from '../../services/dependencyService';

type DocumentRegionCache = LanguageModelCache<VueDocumentRegions>;

export class VueHTMLMode implements LanguageMode {
  private htmlMode: HTMLMode;
  private vueInterpolationMode: VueInterpolationMode;

  constructor(
    tsModule: T_TypeScript,
    serviceHost: IServiceHost,
    documentRegions: DocumentRegionCache,
    workspacePath: string | undefined,
    vueInfoService?: VueInfoService
  ) {
    this.htmlMode = new HTMLMode(documentRegions, workspacePath, vueInfoService);
    this.vueInterpolationMode = new VueInterpolationMode(tsModule, serviceHost);
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
  doValidation(document: TextDocument) {
    return this.htmlMode.doValidation(document).concat(this.vueInterpolationMode.doValidation(document));
  }
  doComplete(document: TextDocument, position: Position) {
    return this.htmlMode.doComplete(document, position);
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
    const interpolationDefinition = this.vueInterpolationMode.findDefinition(document, position);
    return interpolationDefinition.length > 0
      ? interpolationDefinition
      : this.htmlMode.findDefinition(document, position);
  }
  onDocumentRemoved(document: TextDocument) {
    this.htmlMode.onDocumentRemoved(document);
  }
  dispose() {
    this.htmlMode.dispose();
  }
}
