import { LanguageMode } from '../languageModes';

export function getVueMode(): LanguageMode {
  return {
    getId() {
      return 'vue';
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}
