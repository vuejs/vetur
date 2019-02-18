import { getDocUri, activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { position } from '../util';
import { testCompletion } from '../completion/helper';
import { CompletionItemKind } from 'vscode-languageclient';

describe('Should autocomplete interpolation for <template>', () => {
  const templateDocUri = getDocUri('client/templateCompletion/Basic.vue');
  const parentTemplateDocUri = getDocUri('client/templateCompletion/Parent.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(templateDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  describe('Should complete props, data, computed and methods', () => {
    it('completes inside {{ }}', async () => {
      await testCompletion(templateDocUri, position(2, 7), [
        {
          label: 'foo',
          documentation: {
            kind: 'markdown',
            value: 'My foo'
          },
          kind: CompletionItemKind.Property
        },
        {
          label: 'msg',
          documentation: {
            kind: 'markdown',
            value: 'My msg'
          },
          kind: CompletionItemKind.Property
        },
        {
          label: 'count',
          documentation: {
            kind: 'markdown',
            value: 'My count'
          },
          kind: CompletionItemKind.Property
        },
        {
          label: 'hello',
          documentation: {
            kind: 'markdown',
            value: 'My greeting'
          },
          kind: CompletionItemKind.Method
        }
      ]);
    });
  });

  describe('Should complete props from child components', () => {
    it(`completes child component's props`, async () => {
      await testCompletion(parentTemplateDocUri, position(2, 12), [
        {
          label: 'foo',
          documentation: 'My foo'
        }
      ]);
    });
  });
});
