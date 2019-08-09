import * as vscode from 'vscode';

export function generateOpenUserScaffoldSnippetFolderCommand(globalSnippetDir: string) {
  return async () => {
    const uri = vscode.Uri.file(globalSnippetDir);
    vscode.commands.executeCommand('vscode.openFolder', uri, true);
  };
}
