import * as _ from 'lodash';

import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { TextDocument, Position, Range, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';
import { HTMLDocument } from './parser/htmlParser';
import { doComplete } from './services/htmlCompletion';
import { doHover } from './services/htmlHover';
import { findDocumentHighlights } from './services/htmlHighlighting';
import { findDocumentLinks } from './services/htmlLinks';
import { findDocumentSymbols } from './services/htmlSymbolsProvider';
import { htmlFormat } from './services/htmlFormat';
import { parseHTMLDocument } from './parser/htmlParser';
import { doValidation, createLintEngine } from './services/htmlValidation';
import { findDefinition } from './services/htmlDefinition';
import { getTagProviderSettings, IHTMLTagProvider } from './tagProviders';
import { getEnabledTagProviders } from './tagProviders';
import { DocumentContext } from '../../types';
import { VLSFormatConfig } from '../../config';
import { VueInfoService } from '../../services/vueInfoService';
import { getComponentInfoTagProvider } from './tagProviders/componentInfoTagProvider';

type DocumentRegionCache = LanguageModelCache<VueDocumentRegions>;

export function getVueHTMLMode(
  documentRegions: DocumentRegionCache,
  workspacePath: string | undefined,
  vueInfoService?: VueInfoService
): LanguageMode {
  let tagProviderSettings = getTagProviderSettings(workspacePath);
  let enabledTagProviders = getEnabledTagProviders(tagProviderSettings);
  const embeddedDocuments = getLanguageModelCache<TextDocument>(10, 60, document =>
    documentRegions.get(document).getEmbeddedDocument('vue-html')
  );
  const vueDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => parseHTMLDocument(document));
  const lintEngine = createLintEngine();
  let config: any = {};

  return {
    getId() {
      return 'vue-html';
    },
    configure(c) {
      tagProviderSettings = _.assign(tagProviderSettings, c.html.suggest);
      enabledTagProviders = getEnabledTagProviders(tagProviderSettings);
      config = c;
    },
    doValidation(document) {
      const embedded = embeddedDocuments.get(document);
      return doValidation(embedded, lintEngine);
    },
    doComplete(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      const tagProviders: IHTMLTagProvider[] = [...enabledTagProviders];

      const info = vueInfoService ? vueInfoService.getInfo(document) : undefined;
      if (info && info.componentInfo.childComponents) {
        tagProviders.push(getComponentInfoTagProvider(info.componentInfo.childComponents));
      }

      return doComplete(embedded, position, vueDocuments.get(embedded), tagProviders, config.emmet, info);
    },
    doHover(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      const tagProviders: IHTMLTagProvider[] = [...enabledTagProviders];

      return doHover(embedded, position, vueDocuments.get(embedded), tagProviders);
    },
    findDocumentHighlight(document: TextDocument, position: Position) {
      return findDocumentHighlights(document, position, vueDocuments.get(document));
    },
    findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
      return findDocumentLinks(document, documentContext);
    },
    findDocumentSymbols(document: TextDocument) {
      return findDocumentSymbols(document, vueDocuments.get(document));
    },
    format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
      return htmlFormat(document, range, config.vetur.format as VLSFormatConfig);
    },
    findDefinition(document: TextDocument, position: Position) {
      const embedded = embeddedDocuments.get(document);
      const info = vueInfoService ? vueInfoService.getInfo(document) : undefined;
      return findDefinition(embedded, position, vueDocuments.get(embedded), info);
    },
    onDocumentRemoved(document: TextDocument) {
      vueDocuments.onDocumentRemoved(document);
    },
    dispose() {
      vueDocuments.dispose();
    }
  };
}
