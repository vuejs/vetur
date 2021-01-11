import vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export function generateDoctorCommand(client: LanguageClient) {
  return async () => {
    if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.fileName.endsWith('.vue')) {
      return vscode.window.showInformationMessage('Failed to doctor. Make sure the current file is a .vue file.');
    }

    const fileName = vscode.window.activeTextEditor.document.fileName;

    const result = (await client.sendRequest('$/doctor', { fileName })) as string;
    const showText = result.slice(0, 1000) + '....';
    const action = await vscode.window.showInformationMessage(showText, { modal: true }, 'Ok', 'Copy');
    if (action === 'Copy') {
      await vscode.env.clipboard.writeText(result);
    }
  };
}
