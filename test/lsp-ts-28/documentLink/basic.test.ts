import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { sameLineRange, getDocUri } from '../util';

describe('Should do documentLink', () => {
  const docUri = getDocUri('client/documentLink/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME * 3);
  });

  it('shows all documentLinks for Basic.vue', async () => {
    await testLink(docUri, [
      { target: vscode.Uri.parse('https://vuejs.org/images/logo.png'), range: sameLineRange(2, 14, 47) },
      { target: getDocUri('client/documentLink/foo'), range: sameLineRange(3, 13, 18) },
      { target: getDocUri('client/documentLink/foo.js'), range: sameLineRange(7, 13, 21) }
    ]);
  });
});

async function testLink(docUri: vscode.Uri, expectedLinks: vscode.DocumentLink[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand('vscode.executeLinkProvider', docUri)) as vscode.DocumentLink[];

  expectedLinks.forEach(el => {
    assert.ok(
      result.some(l => isEqualLink(l, el)),
      `Failed to find same link as ${el.target!.fsPath}. Seen links are:\n${JSON.stringify(result, null, 2)}`
    );
  });

  function isEqualLink(h1: vscode.DocumentLink, h2: vscode.DocumentLink) {
    return h1.target!.fsPath === h2.target!.fsPath && h1.range.isEqual(h2.range);
  }
}
