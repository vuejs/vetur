import { CompletionItem, CompletionItemKind, MarkdownString } from 'vscode';
import { position } from '../../../util';
import { testCompletion, testNoSuchCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete interpolation for <template>', () => {
  const parentTemplateDocUri = getDocUri('completion/interpolation/Parent.vue');

  describe('Should complete emits', () => {
    it(`completes child component's emits`, async () => {
      await testCompletion(parentTemplateDocUri, position(1, 10), [
        {
          label: 'foo',
          kind: CompletionItemKind.Function,
          documentation: new MarkdownString('My foo').appendCodeblock(`foo: () => true`, 'js')
        }
      ]);
    });
  });
});
