import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { getDocUri, sameLineRange } from '../util';

describe('Should do codeAction', () => {
  const docUri = getDocUri('client/codeAction/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
    // Wait for diagnostics
    await sleep(3000);
  });

  it('finds codeAction for unused import', async () => {
    const codeActions = [
      { title: 'Remove variable statement', command: 'vetur.applyWorkspaceEdits' },
      { title: 'Ignore this error message', command: 'vetur.applyWorkspaceEdits' },
      { title: 'Disable checking for this file', command: 'vetur.applyWorkspaceEdits' },
      { title: 'Extract to function in module scope', command: 'vetur.chooseTypeScriptRefactoring' },
      { title: 'Extract to constant in enclosing scope', command: 'vetur.chooseTypeScriptRefactoring' }
    ];
    await testCodeAction(docUri, sameLineRange(5, 0, 27), codeActions);
  });

  it('finds codeAction for unused variables', async () => {
    const codeActions = [
      { title: 'Remove variable statement', command: 'vetur.applyWorkspaceEdits' },
      { title: 'Ignore this error message', command: 'vetur.applyWorkspaceEdits' },
      { title: 'Disable checking for this file', command: 'vetur.applyWorkspaceEdits' }
    ];

    await testCodeAction(docUri, sameLineRange(7, 0, 12), codeActions);
  });

});

interface CodeAction {
  title: string;
  command: string;
}

async function testCodeAction(docUri: vscode.Uri, range: vscode.Range, expectedActions: CodeAction[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCodeActionProvider',
    docUri,
    range
  )) as CodeAction[];

  result.forEach((r, i) => {
    assert.equal(r.title, expectedActions[i].title);
    assert.equal(r.command, expectedActions[i].command);
  });
}
