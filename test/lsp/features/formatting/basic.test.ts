import * as vscode from 'vscode';
import * as fs from 'fs';
import * as assert from 'assert';
import { activateLS, showFile, sleep, readFileAsync, setEditorContent, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { getDocUri, getDocPath } from '../../util';

describe('Should format', () => {
  const fixturePath = getDocPath('formatting');
  const cases = fs
    .readdirSync(fixturePath)
    .filter((s) => !s.includes('Expected'))
    .map((s) => s.slice(0, -'.vue'.length));

  before('activate', async () => {
    await activateLS();

    for (let i = 0; i < cases.length; i++) {
      await showFile(getDocUri(`formatting/${cases[i]}.vue`));
    }

    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  for (let i = 0; i < cases.length; i++) {
    it(`formats ${cases[i]}.vue`, async () => {
      await testFormat(getDocUri(`formatting/${cases[i]}.vue`), getDocUri(`formatting/${cases[i]}.Expected.vue`));
    });
  }
});

async function testFormat(docUri: vscode.Uri, expectedDocUri: vscode.Uri) {
  const editor = await showFile(docUri);
  const oldContent = editor.document.getText();

  const result = (await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', docUri, {
    tabSize: 2,
    insertSpaces: true,
  })) as vscode.TextEdit[];

  if (result) {
    await editor.edit((b) => result.forEach((f) => b.replace(f.range, f.newText)));
  }

  const expected = await readFileAsync(expectedDocUri.fsPath);

  assert.equal(editor.document.getText(), expected);

  await setEditorContent(editor, oldContent);
}
