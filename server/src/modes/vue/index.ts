import { LanguageMode } from '../languageModes';
import { doScaffoldComplete } from './scaffoldCompletion';

export function getVueMode(): LanguageMode {
  return {
    getId() {
      return 'vue';
    },
    doComplete(document, position) {
      return doScaffoldComplete();
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}
