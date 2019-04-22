import { FormattingOptions, Position, Range, TextDocument } from 'vscode-languageserver-types';
import { VueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { LanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { VueInfoService } from '../../services/vueInfoService';
import { DocumentContext } from '../../types';
import { HTMLMode } from './htmlMode';
import { VueInterpolationMode } from './interpolationMode';
import { IServiceHost } from '../../services/typescriptService/serviceHost';

type DocumentRegionCache = LanguageModelCache<VueDocumentRegions>;

export function getVueHTMLMode(
  serviceHost: IServiceHost,
  documentRegions: DocumentRegionCache,
  workspacePath: string | undefined,
  vueInfoService?: VueInfoService
): LanguageMode {
  const htmlMode = new HTMLMode(documentRegions, workspacePath, vueInfoService);
  const vueInterpolationMode = new VueInterpolationMode(serviceHost);

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
    doHover(document: TextDocument, position: Position) {
      return htmlMode.doHover(document, position);
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
    findDefinition(document: TextDocument, position: Position) {
      return htmlMode.findDefinition(document, position);
    },
    onDocumentRemoved(document: TextDocument) {
      htmlMode.onDocumentRemoved(document);
    },
    dispose() {
      htmlMode.dispose();
    }
  };
}
