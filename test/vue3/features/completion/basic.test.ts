import { CompletionItemKind } from 'vscode';
import { getDocUri } from '../../path';
import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';

describe('Vue 3 integration test', () => {
  const fileUri = getDocUri('completion/Basic.vue');

  describe('Should complete Vue 3 options', () => {
    it('complete `setup`', async () => {
      await testCompletion(fileUri, position(6, 2), [
        {
          label: 'setup?',
          kind: CompletionItemKind.Field,
          insertText: 'setup'
        }
      ]);
    });
  });
});
