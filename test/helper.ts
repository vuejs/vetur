import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';

export const ext = vscode.extensions.getExtension('octref.vetur');

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

export async function activate(docUri: vscode.Uri) {
  if (ext) {
    await ext.activate();
  }
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2500);
  } catch (e) {
    console.error(e);
  }
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../test/fixture', p);
};
export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
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
  await activate(docUri);
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

  await setTestContent(oldContent);
}

export async function testDefinition(docUri: vscode.Uri, position: vscode.Position, expectedLocation: vscode.Location) {
  await activate(docUri);

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