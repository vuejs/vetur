import { LanguageModelCache, getLanguageModelCache } from '../../languageModelCache'
import { LanguageMode } from '../../languageModes'
import { VueDocumentRegions } from '../../embeddedSupport'

import { provideCompletionItems } from './completion-item'
import { provideDocumentSymbols } from './symbols-finder'
import { stylusHover } from './stylus-hover'


export function getStylusMode (documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document => documentRegions.get(document).getEmbeddedDocument('stylus'))
  return {
    getId: () => 'stylus',
    onDocumentRemoved() {},
    dispose() {},
    doComplete(document, position) {
      const embedded = embeddedDocuments.get(document)
      return provideCompletionItems(embedded, position)
    },
    findDocumentSymbols(document) {
      const embedded = embeddedDocuments.get(document)
      return provideDocumentSymbols(embedded)
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.get(document)
      return stylusHover(embedded, position)
    },
  }
}

export const wordPattern = /(#?-?\d*\.\d\w*%?)|([$@#!.:]?[\w-?]+%?)|[$@#!.]/g
