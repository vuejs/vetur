import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, sameLineRange, getDocUri } from '../util';

describe('Should do documentColor', () => {
  const docUri = getDocUri('client/documentColor/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME * 2);
  });

  it('show no duplicate document colors', async () => {
    await testHighlight(docUri, position(2, 5), [
      { color: { red: 1, blue: 1, green: 1, alpha: 1 }, range: sameLineRange(2, 22, 27) },
      { color: { red: 0, blue: 0, green: 0, alpha: 1 }, range: sameLineRange(8, 11, 16) }
    ]);
  });
});

async function testHighlight(docUri: vscode.Uri, position: vscode.Position, expectedColors: vscode.ColorInformation[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDocumentColorProvider',
    docUri,
    position
  )) as vscode.ColorInformation[];

  expectedColors.forEach(eh => {
    assert.ok(result.some(h => isEqualColor(h, eh)));
  });

  function isEqualColor(h1: vscode.DocumentHighlight, h2: vscode.DocumentHighlight) {
    return h1.kind === h2.kind && h1.range.isEqual(h2.range);
  }
}
