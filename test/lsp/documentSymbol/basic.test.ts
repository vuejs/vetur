import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { location } from '../util';

describe('Should do documentSymbol', () => {
  const docUri = getDocUri('client/documentSymbol/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows all documentSymbols for Basic.vue', async () => {
    await testSymbol(docUri, [
      {
        name: '"Basic.vue"',
        kind: 1,
        // Todo: Fix this test
        containerName: '',
        location: location(docUri, 0, 0, 13, 0),
      },
      {
        name: 'template',
        location: location(docUri, 0, 0, 3, 11),
        containerName: '"Basic.vue"',
        kind: 7
      },
      {
        name: 'div.counter-wrapper',
        location: location(docUri, 1, 2, 2, 8),
        containerName: 'template',
        kind: 7
      },
      {
        name: 'script',
        location: location(docUri, 5, 0, 13, 9),
        containerName: '',
        kind: 7
      },
      {
        name: 'data',
        kind: 5,
        location: location(docUri, 7, 2, 11, 3),
        // Todo: Fix this test
        containerName: '"Basic.vue"'
      },
      {
        name: 'style',
        location: location(docUri, 15, 0, 19, 8),
        containerName: '',
        kind: 7
      },
      {
        name: '.counter-wrapper > *',
        kind: 4,
        containerName: 'style',
        location: location(docUri, 16, 0, 18, 1)
      }
    ]);
  });
});

async function testSymbol(docUri: vscode.Uri, expectedSymbols: vscode.SymbolInformation[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    docUri
  )) as vscode.SymbolInformation[];

  expectedSymbols.forEach(es => {
    const rs = result.find(s => {
      return s.name === es.name && s.kind === es.kind && s.containerName === es.containerName;
    });
    assert.ok(rs);
    assertEqualSymbol(rs!, es);
  });

  function assertEqualSymbol(h1: vscode.SymbolInformation, h2: vscode.SymbolInformation) {
    assert.deepEqual(h1, h2);
  }
}
