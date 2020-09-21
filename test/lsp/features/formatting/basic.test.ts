import assert from 'assert';
import fs from 'fs';
import vscode from 'vscode';
import { showFile, setEditorContent } from '../../../editorHelper';
import { getDocPath, getDocUri } from '../../path';

describe('Should format', () => {
  const fixturePath = getDocPath('formatting');
  const cases = fs
    .readdirSync(fixturePath)
    .filter(s => !s.includes('Expected'))
    .map(s => s.slice(0, -'.vue'.length));

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
    insertSpaces: true
  })) as vscode.TextEdit[];

  if (result) {
    await editor.edit(b => result.forEach(f => b.replace(f.range, f.newText)));
  }

  const expected = await readFileAsync(expectedDocUri.fsPath);

  assert.equal(editor.document.getText(), expected);

  await setEditorContent(editor, oldContent);
}

function readFileAsync(path: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}
