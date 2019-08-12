import * as vscode from 'vscode';
import * as fs from 'fs';

export function generateOpenUserScaffoldSnippetFolderCommand(globalSnippetDir: string) {
  return async () => {
    const uri = vscode.Uri.file(globalSnippetDir);

    if (!fs.existsSync(uri.fsPath)) {
      fs.mkdirSync(uri.fsPath);
    }

    vscode.commands.executeCommand('vscode.openFolder', uri, true);
  };
}
