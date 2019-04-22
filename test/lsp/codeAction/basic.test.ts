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

    // More sleep for waiting diagnostics
    await sleep(FILE_LOAD_SLEEP_TIME);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds codeAction for unused import', async () => {
    const codeActions = [{ title: `Remove declaration for: 'lodash'`, command: 'vetur.applyWorkspaceEdits' }];
    await testCodeAction(docUri, sameLineRange(5, 6, 6), codeActions);
  });

  it('finds codeAction for unused variables', async () => {
    const codeActions = [{ title: `Remove declaration for: 'foo'`, command: 'vetur.applyWorkspaceEdits' }];

    await testCodeAction(docUri, sameLineRange(7, 6, 6), codeActions);
  });
});

interface CodeAction {
  title: string;
  command: string;
}

async function testCodeAction(docUri: vscode.Uri, range: vscode.Range, expectedActions: CodeAction[]) {
  // For diagnostics to show up
  await sleep(2000);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCodeActionProvider',
    docUri,
    range
  )) as CodeAction[];

  expectedActions.forEach(eAction => {
    assert.ok(
      result.some(rAction => {
        return rAction.title === eAction.title && rAction.command === eAction.command;
      }),
      `Cannot find matching codeAction with title '${eAction.title}'\n` +
        `Seen codeActions are:\n${JSON.stringify(result, null, 2)}`
    );
  });
}
