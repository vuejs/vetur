import { CompletionItem, CompletionItemKind, MarkdownString } from 'vscode';
import { position } from '../../../util';
import { getDocUri } from '../../path';
import { testCompletion, testNoSuchCompletion } from '../../../completionHelper';

describe('Should autocomplete interpolation for <template> in class component', () => {
  const parentTemplateDocUri = getDocUri('completion/interpolation/classComponent/Parent.vue');

  describe('Should complete emits', () => {
    it(`completes child component's emits`, async () => {
      await testCompletion(parentTemplateDocUri, position(1, 16), [
        {
          label: 'foo',
          kind: CompletionItemKind.Function,
          documentation: new MarkdownString('My foo').appendCodeblock(`foo: () => true`, 'js')
        }
      ]);
    });
  });
});
