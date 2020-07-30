import * as vscode from 'vscode';
import * as fs from 'fs';
import { sleep } from './util';
import { performance } from 'perf_hooks';

export const EXT_IDENTIFIER = 'octref.vetur';
export const FILE_LOAD_SLEEP_TIME = 1500;

export const ext = vscode.extensions.getExtension(EXT_IDENTIFIER);

/**
 * Activate Extension and open a Vue file to make sure LS is running
 */
export async function activateLS() {
  try {
    await ext!.activate();
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

export async function setEditorContent(editor: vscode.TextEditor, content: string): Promise<boolean> {
  const doc = editor.document;
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit(eb => eb.replace(all, content));
}

export function readFileAsync(path: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}

// Retry to get diagnostics until length > 0 or timeout
export async function getDiagnosticsAndTimeout(docUri: vscode.Uri, timeout = 5000) {
  const startTime = performance.now();

  let result = vscode.languages.getDiagnostics(docUri);

  while (result.length <= 0 && startTime + timeout > performance.now()) {
    result = vscode.languages.getDiagnostics(docUri);
    await sleep(100);
  }

  return result;
}
