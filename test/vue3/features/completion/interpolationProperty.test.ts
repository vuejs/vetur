import { CompletionItem, CompletionItemKind, MarkdownString } from 'vscode';
import { getDocUri } from '../../path';
import { testCompletion, testNoSuchCompletion } from '../../../completionHelper';
import { position } from '../../../util';

describe('Should autocomplete interpolation for <template> in property class component', () => {
  const parentTemplateDocUri = getDocUri('completion/interpolation/propertyDecorator/Parent.vue');

  describe('Should complete emits', () => {
    it(`completes child component's emits`, async () => {
      await testCompletion(parentTemplateDocUri, position(1, 25), [
        {
          label: 'foo',
          kind: CompletionItemKind.Function,
          documentation: new MarkdownString('My foo')
            .appendCodeblock(
              `@Emit('foo')
foo() {}`,
              'js'
            )
            .appendText('\n')
            .appendMarkdown('My foo2')
            .appendCodeblock(
              `@Emit('foo')
foo2() {}`,
              'js'
            )
        },
        {
          label: 'foo-bar',
          kind: CompletionItemKind.Function,
          documentation: new MarkdownString('My fooBar').appendCodeblock(
            `@Emit()
fooBar() {}`,
            'js'
          )
        }
      ]);
    });

    it(`completes child component's emits only with emits option`, async () => {
      await testCompletion(parentTemplateDocUri, position(2, 36), [
        {
          label: 'foo',
          kind: CompletionItemKind.Function,
          documentation: new MarkdownString('My foo emits').appendCodeblock(`foo: () => true`, 'js')
        }
      ]);
    });
  });
});
