import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, getDocUri } from '../util';
import { testCompletion } from './helper';
import { CompletionItemKind } from 'vscode';

describe('Should do path completion for import', () => {
  const scriptDocUri = getDocUri('client/completion/script/PathCompletion.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(scriptDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
    // TS LS completion starts slow.
    await sleep(2000);
  });

  it('completes local file names when importing', async () => {
    await testCompletion(scriptDocUri, position(5, 10), [
      {
        label: 'Basic',
        kind: CompletionItemKind.File,
        detail: 'Basic.vue'
      },
      {
        label: 'Item',
        kind: CompletionItemKind.File,
        detail: 'Item.vue'
      }
    ]);
  });

  it('completes folder names', async () => {
    await testCompletion(scriptDocUri, position(6, 11), [
      {
        label: 'script',
        kind: CompletionItemKind.Folder
      },
      {
        label: 'style',
        kind: CompletionItemKind.Folder
      },
      {
        label: 'template',
        kind: CompletionItemKind.Folder
      }
    ]);
  });
});
