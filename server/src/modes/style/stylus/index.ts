import * as _ from 'lodash';
import * as emmet from 'vscode-emmet-helper';
import { CompletionList } from 'vscode-languageserver-types';

import { Priority } from '../emmet';
import { LanguageModelCache, getLanguageModelCache } from '../../languageModelCache';
import { LanguageMode } from '../../languageModes';
import { VueDocumentRegions } from '../../embeddedSupport';

import { provideCompletionItems } from './completion-item';
import { provideDocumentSymbols } from './symbols-finder';
import { stylusHover } from './stylus-hover';

export function getStylusMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document => documentRegions.get(document).getEmbeddedDocument('stylus'));
  return {
    getId: () => 'stylus',
    onDocumentRemoved() {},
    dispose() {},
    doComplete(document, position) {
      const embedded = embeddedDocuments.get(document);
      
      const emmetCompletions: CompletionList = emmet.doComplete(document, position, 'stylus', {
        useNewEmmet: true,
        showExpandedAbbreviation: true,
        showAbbreviationSuggestions: true,
        syntaxProfiles: {},
        variables: {}
      });
      const emmetItems = _.map(emmetCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Emmet + i.label
        };
      });
      const lsCompletions = provideCompletionItems(embedded, position);
      const lsItems = _.map(lsCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Platform + i.label
        };
      });

      return {
        isIncomplete: true,
        items: _.concat(emmetItems, lsItems)
      };
    },
    findDocumentSymbols(document) {
      const embedded = embeddedDocuments.get(document);
      return provideDocumentSymbols(embedded);
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.get(document);
      return stylusHover(embedded, position);
    },
  };
}

export const wordPattern = /(#?-?\d*\.\d\w*%?)|([$@#!.:]?[\w-?]+%?)|[$@#!.]/g;
