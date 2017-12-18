import { LanguageMode } from '../languageModes';
import { doScaffoldComplete } from './scaffoldCompletion';

export function getVueMode(): LanguageMode {
  return {
    getId() {
      return 'vue';
    },
    doComplete(document, position) {
      const offset = document.offsetAt(position);
      const text = document.getText().slice(0, offset);
      const needBracket = /<\w*$/.test(text);
      const ret = doScaffoldComplete();
      // remove duplicate <
      if (needBracket) {
        ret.items.forEach(item => {
          item.insertText = item.insertText!.slice(1);
        });
      }
      return ret;
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}
