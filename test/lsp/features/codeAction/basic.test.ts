import vscode from 'vscode';
import assert from 'assert';
import { showFile } from '../../../editorHelper';
import { sameLineRange } from '../../../util';
import { CodeAction } from 'vscode-languageclient';
import { getDocUri } from '../../path';
import { getDiagnosticsAndTimeout } from '../../../diagnosticHelper';

describe('Should do codeAction', function () {
  // Retry for flakey tests
  this.retries(3);

  const docUri = getDocUri('codeAction/Basic.vue');

  it('finds codeAction for unused import', async () => {
    const codeActions: CodeAction[] = [{ title: `Remove unused declaration for: 'lodash'` }];
    await testCodeAction(docUri, sameLineRange(5, 6, 6), codeActions);
  });

  it('finds codeAction for unused variables', async () => {
    const codeActions: CodeAction[] = [{ title: `Remove unused declaration for: 'foo'` }];
    await testCodeAction(docUri, sameLineRange(7, 6, 6), codeActions);
  });

  it('finds fixAll codeAction for unused import', async () => {
    const codeActions = [{ title: `Delete all unused declarations` }];
    await testCodeAction(docUri, sameLineRange(5, 6, 6), codeActions);
  });
});

async function testCodeAction(docUri: vscode.Uri, range: vscode.Range, expectedActions: CodeAction[]) {
  await showFile(docUri);

  await getDiagnosticsAndTimeout(docUri);

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
