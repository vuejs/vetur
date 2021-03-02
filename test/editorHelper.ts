import vscode from 'vscode';
import type { BaseLanguageClient } from 'vscode-languageclient';

const EXT_IDENTIFIER = 'octref.vetur';
const ext = vscode.extensions.getExtension(EXT_IDENTIFIER);
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

export const sendLSRequest: BaseLanguageClient['sendRequest'] = (...args: any[]) => ext!.exports.sendRequest(...args);
