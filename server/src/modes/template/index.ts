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

export function getVueHTMLMode(
  tsModule: T_TypeScript,
  serviceHost: IServiceHost,
  documentRegions: DocumentRegionCache,
  workspacePath: string | undefined,
  vueInfoService?: VueInfoService
): LanguageMode {
  const htmlMode = new HTMLMode(documentRegions, workspacePath, vueInfoService);
  const vueInterpolationMode = new VueInterpolationMode(tsModule, serviceHost);

  return {
    getId() {
      return 'vue-html';
    },
    configure(c) {
      htmlMode.configure(c);
    },
    doValidation(document) {
      return htmlMode.doValidation(document).concat(vueInterpolationMode.doValidation(document));
    },
    doComplete(document: TextDocument, position: Position) {
      return htmlMode.doComplete(document, position);
    },
    doHover(document: TextDocument, position: Position): Hover {
      const interpolationHover = vueInterpolationMode.doHover(document, position);
      return interpolationHover.contents.length !== 0 ? interpolationHover : htmlMode.doHover(document, position);
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      return htmlMode.findDocumentHighlight(document, position);
    },
    findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
      return htmlMode.findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols(document: TextDocument) {
      return htmlMode.findDocumentSymbols(document);
    },
    format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
      return htmlMode.format(document, range, formattingOptions);
    },
    findReferences(document: TextDocument, position: Position): Location[] {
      return vueInterpolationMode.findReferences(document, position);
    },
    findDefinition(document: TextDocument, position: Position) {
      const interpolationDefinition = vueInterpolationMode.findDefinition(document, position);
      return interpolationDefinition.length > 0 ? interpolationDefinition : htmlMode.findDefinition(document, position);
    },
    onDocumentRemoved(document: TextDocument) {
      htmlMode.onDocumentRemoved(document);
    },
    dispose() {
      htmlMode.dispose();
    }
  };
}
