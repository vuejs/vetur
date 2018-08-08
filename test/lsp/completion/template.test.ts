import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../../helper';

describe('Should autocomplete', () => {
  const templateDocUri = getDocUri('client/completion/template/Basic.vue');
  const templateFrameworkDocUri = getDocUri('client/completion/template/Framework.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(templateDocUri);
    await showFile(templateFrameworkDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  describe('Should complete <template> section', () => {
    it('completes directives such as v-if', async () => {
      await testCompletion(templateDocUri, new vscode.Position(1, 8), ['v-if', 'v-cloak']);
    });

    it('completes html tags', async () => {
      await testCompletion(templateDocUri, new vscode.Position(2, 6), ['img', 'iframe']);
    });

    it('completes imported components', async () => {
      await testCompletion(templateDocUri, new vscode.Position(2, 6), ['item']);
    });
  });

  describe('Should complete element-ui components', () => {
    it('completes <el-button> and <el-card>', async () => {
      await testCompletion(templateFrameworkDocUri, new vscode.Position(2, 5), ['el-button', 'el-card']);
    });

    it('completes attributes for <el-button>', async () => {
      await testCompletion(templateFrameworkDocUri, new vscode.Position(1, 14), ['size', 'type', 'plain']);
    });

  });
});

async function testCompletion(docUri: vscode.Uri, position: vscode.Position, expectedItems: string[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  expectedItems.forEach(ei => {
    assert.ok(result.items.some(i => {
      return i.label === ei;
    }));
  });
}
