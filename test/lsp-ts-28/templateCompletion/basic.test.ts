import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../../lsp/helper';
import { position, getDocUri } from '../util';
import { testCompletion, testNoSuchCompletion } from '../completion/helper';
import { CompletionItem, CompletionItemKind, MarkdownString } from 'vscode';

describe('Should autocomplete interpolation for <template>', () => {
  const templateDocUri = getDocUri('client/templateCompletion/Basic.vue');
  const parentTemplateDocUri = getDocUri('client/templateCompletion/Parent.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(templateDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  const defaultList: CompletionItem[] = [
    {
      label: 'foo',
      documentation: new MarkdownString('My foo').appendCodeblock(
        `foo: {
  type: Boolean,
  default: false
}`,
        'js'
      ),
      kind: CompletionItemKind.Property
    },
    {
      label: 'msg',
      documentation: new MarkdownString('My msg').appendCodeblock(`msg: 'Vetur means "Winter" in icelandic.'`, 'js'),
      kind: CompletionItemKind.Property
    },
    {
      label: 'count',
      documentation: new MarkdownString('My count').appendCodeblock(
        `count () {
  return this.$store.state.count
}`,
        'js'
      ),
      kind: CompletionItemKind.Property
    },
    {
      label: 'hello',
      documentation: new MarkdownString('My greeting').appendCodeblock(
        `hello () {
  console.log(this.msg)
}`,
        'js'
      ),

      kind: CompletionItemKind.Method
    }
  ];

  describe('Should complete props, data, computed and methods', () => {
    it('completes inside {{ }}', async () => {
      await testCompletion(templateDocUri, position(2, 7), defaultList);
    });

    it(`completes child component tag`, async () => {
      await testCompletion(parentTemplateDocUri, position(4, 5), [
        {
          label: 'basic',
          documentationStart: 'My basic tag\n```js\nexport default {'
        }
      ]);
    });

    it(`completes child component's props`, async () => {
      await testCompletion(parentTemplateDocUri, position(2, 12), [
        {
          label: 'foo',
          documentation: new MarkdownString('My foo').appendCodeblock(
            `foo: {
  type: Boolean,
  default: false
}`,
            'js'
          )
        }
      ]);
    });

    it('completes inside v-if=""', async () => {
      await testCompletion(parentTemplateDocUri, position(3, 17), defaultList);
    });
    it(`doesn't completes on the edge " of v-if=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 16), defaultList);
    });
    it(`doesn't completes on the edge " of v-if=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 18), defaultList);
    });

    it('completes inside @click=""', async () => {
      await testCompletion(parentTemplateDocUri, position(3, 27), defaultList);
    });
    it(`doesn't completes on the edge " of @click=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 26), defaultList);
    });
    it(`doesn't completes on the edge " of @click=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 28), defaultList);
    });

    it('completes inside :foo=""', async () => {
      await testCompletion(parentTemplateDocUri, position(3, 35), defaultList);
    });
    it(`doesn't completes on the edge " of :foo=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 34), defaultList);
    });
    it(`doesn't completes on the edge " of :foo=""`, async () => {
      await testNoSuchCompletion(parentTemplateDocUri, position(3, 36), defaultList);
    });
  });
});
