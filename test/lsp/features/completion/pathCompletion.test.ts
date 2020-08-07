import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { CompletionItemKind } from 'vscode';
import { getDocUri } from '../../path';

describe('Should do path completion for import', () => {
  const scriptDocUri = getDocUri('completion/script/PathCompletion.vue');

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
