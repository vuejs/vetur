import { CompletionItemKind } from 'vscode';
import { getDocUri } from '../../path';
import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';

describe('Vue 3 integration test', () => {
  const fileUri = getDocUri('packages/vue3/src/App.vue');

  describe('Should complete Vue 3 options', () => {
    it('complete `setup`', async () => {
      await testCompletion(fileUri, position(8, 2), [
        {
          label: 'setup?',
          kind: CompletionItemKind.Field,
          insertText: 'setup'
        }
      ]);
    });
  });
});
