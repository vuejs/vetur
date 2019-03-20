import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, sameLineRange, getDocUri } from '../util';

describe('Should do documentHighlight', () => {
  const docUri = getDocUri('client/documentHighlight/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows highlights for <div> tags', async () => {
    await testHighlight(docUri, position(2, 5), [
      { kind: vscode.DocumentHighlightKind.Read, range: sameLineRange(2, 5, 8) },
      { kind: vscode.DocumentHighlightKind.Read, range: sameLineRange(2, 20, 23) }
    ]);
  });

  it('shows highlights for this.msg', async () => {
    await testHighlight(docUri, position(23, 6), [
      { kind: vscode.DocumentHighlightKind.Write, range: sameLineRange(23, 6, 9) },
      { kind: vscode.DocumentHighlightKind.Text, range: sameLineRange(33, 23, 26) }
    ]);
  });

  it('shows highlights for Item', async () => {
    await testHighlight(docUri, position(20, 16), [
      { kind: vscode.DocumentHighlightKind.Write, range: sameLineRange(17, 7, 11) },
      { kind: vscode.DocumentHighlightKind.Write, range: sameLineRange(20, 16, 20) }
    ]);
  });
});

async function testHighlight(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedHighlights: vscode.DocumentHighlight[]
) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDocumentHighlights',
    docUri,
    position
  )) as vscode.DocumentHighlight[];

  expectedHighlights.forEach(eh => {
    assert.ok(result.some(h => isEqualHighlight(h, eh)));
  });

  function isEqualHighlight(h1: vscode.DocumentHighlight, h2: vscode.DocumentHighlight) {
    return h1.kind === h2.kind && h1.range.isEqual(h2.range);
  }
}
