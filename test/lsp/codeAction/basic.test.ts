import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { getDocUri, sameLineRange } from '../util';
import { CodeAction, WorkspaceEdit } from 'vscode-languageclient';

describe('Should do codeAction', () => {
  const docUri = getDocUri('client/codeAction/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);

    // More sleep for waiting diagnostics
    await sleep(FILE_LOAD_SLEEP_TIME);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds codeAction for unused import', async () => {
    const codeActions: CodeAction[] = [{ title: `Remove declaration for: 'lodash'` }];
    await testCodeAction(docUri, sameLineRange(5, 6, 6), codeActions);
  });

  it('finds codeAction for unused variables', async () => {
    const codeActions: CodeAction[] = [{ title: `Remove declaration for: 'foo'` }];

    await testCodeAction(docUri, sameLineRange(7, 6, 6), codeActions);
  });
});

async function testCodeAction(docUri: vscode.Uri, range: vscode.Range, expectedActions: CodeAction[]) {
  // For diagnostics to show up
  await sleep(2000);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCodeActionProvider',
    docUri,
    range
  )) as vscode.CodeAction[];

  expectedActions.forEach(eAction => {
    const matchingAction = result.find(rAction => rAction.title === eAction.title);
    assert.ok(
      matchingAction,
      `Cannot find matching codeAction with title '${eAction.title}'\n` +
        `Seen codeActions are:\n${JSON.stringify(result, null, 2)}`
    );
  });
}
