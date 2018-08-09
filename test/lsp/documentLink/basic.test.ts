import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { sameLineRange } from '../util';

describe('Should do documentLink', () => {
  const docUri = getDocUri('client/documentLink/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows all documentLinks for Basic.vue', async () => {
    await testLink(docUri, [
      { target: vscode.Uri.parse('https://vuejs.org/images/logo.png'), range: sameLineRange(2, 14, 47) },
      { target: getDocUri('client/documentLink/Basic.vue/foo'), range: sameLineRange(3, 13, 18) }
    ]);
  });
});

async function testLink(
  docUri: vscode.Uri,
  expectedLinks: vscode.DocumentLink[]
) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeLinkProvider',
    docUri
  )) as vscode.DocumentLink[];

  expectedLinks.forEach(el => {
    assert.ok(result.some(l => isEqualLink(l, el)));
  });

  function isEqualLink(h1: vscode.DocumentLink, h2: vscode.DocumentLink) {
    return h1.target!.path === h2.target!.path && h1.range.isEqual(h2.range);
  }
}
