import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, showFile, sleep, readFileAsync, setEditorContent, FILE_LOAD_SLEEP_TIME } from '../helper';
import { getDocUri } from '../util';

describe('Should format', () => {
  const docUri = getDocUri('client/formatting/Basic.vue');
  const expectedDocUri = getDocUri('client/formatting/Basic.Expected.vue');

  const docUri2 = getDocUri('client/formatting/VueHNUserView.vue');
  const expectedDocUri2 = getDocUri('client/formatting/VueHNUserView.Expected.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await showFile(docUri2);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('formats', async () => {
    await testFormat(docUri, expectedDocUri);
    await testFormat(docUri2, expectedDocUri2);
  });
});

async function testFormat(docUri: vscode.Uri, expectedDocUri: vscode.Uri) {
  const editor = await showFile(docUri);
  const oldContent = editor.document.getText();

  const result = (await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', docUri, {
    tabSize: 2,
    insertSpaces: true
  })) as vscode.TextEdit[];

  if (result) {
    await editor.edit(b => result.forEach(f => b.replace(f.range, f.newText)));
  }

  const expected = await readFileAsync(expectedDocUri.fsPath);

  assert.equal(editor.document.getText(), expected);

  await setEditorContent(editor, oldContent);
}
