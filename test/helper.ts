import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';

export const EXT_IDENTIFIER = 'octref.vetur';

export const ext = vscode.extensions.getExtension(EXT_IDENTIFIER);

/**
 * Activate Extension and open a Vue file to make sure LS is running
 */
export async function activateLS() {
  try {
    await ext!.activate();
    await sleep(500);
  } catch (err) {
    console.error(err);
    console.log(`Failed to activate ${EXT_IDENTIFIER}`);
    process.exit(1);
  }
}

export async function showFile(docUri: vscode.Uri) {
  const doc = await vscode.workspace.openTextDocument(docUri);
  return await vscode.window.showTextDocument(doc);
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../test/fixture', p);
};
export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setEditorContent(editor: vscode.TextEditor, content: string): Promise<boolean> {
  const doc = editor.document;
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit(eb => eb.replace(all, content));
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

export async function testFormat(docUri: vscode.Uri, expectedDocUri: vscode.Uri) {
  const editor = await showFile(docUri);
  await sleep(1000);
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

export async function testDefinition(docUri: vscode.Uri, position: vscode.Position, expectedLocation: vscode.Location) {
  await showFile(docUri);
  await sleep(1000);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider',
    docUri,
    position
  )) as vscode.Location[];

  assert.ok(result[0].range.isEqual(expectedLocation.range));
  assert.equal(result[0].uri.path, expectedLocation.uri.path);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}