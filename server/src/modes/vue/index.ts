import { LanguageMode } from '../../embeddedSupport/languageModes';
import { doScaffoldComplete } from './scaffoldCompletion';
import { SnippetManager } from './snippets';

export function getVueMode(workspacePath: string, globalSnippetDir: string | undefined): LanguageMode {
  let config: any = {};
  
  const snippetManager = new SnippetManager(workspacePath, globalSnippetDir);

  return {
    getId() {
      return 'vue';
    },
    configure(c) {
      config = c;
    },
    doComplete(document, position) {
      if (!config.vetur.completion.useScaffoldSnippets) {
        return { isIncomplete: false, items: [] };
      }
      return {
        isIncomplete: false,
        items: snippetManager.completeSnippets()
      };
      // const offset = document.offsetAt(position);
      // const text = document.getText().slice(0, offset);
      // const needBracket = /<\w*$/.test(text);
      // const ret = doScaffoldComplete();
      // // remove duplicate <
      // if (needBracket) {
      //   ret.items.forEach(item => {
      //     item.insertText = item.insertText!.slice(1);
      //   });
      // }
      // return ret;
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}
