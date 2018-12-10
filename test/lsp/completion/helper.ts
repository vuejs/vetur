import * as vscode from 'vscode';
import * as assert from 'assert';
import { showFile } from '../../helper';

export async function testCompletion(docUri: vscode.Uri, position: vscode.Position, expectedItems: string[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  expectedItems.forEach(ei => {
    assert.ok(result.items.some(i => {
      return i.label === ei;
    }));
  });
}
