import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { position, location } from '../util';

describe('Should find references', () => {
  const docUri = getDocUri('client/references/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds references for this.msg', async () => {
    await testReferences(docUri, position(33, 23), [
      location(docUri, 23, 6, 23, 9),
      location(docUri, 33, 23, 33, 26)
    ]);
  });

  it('finds references for lodash', async () => {
    const lodashDtsUri = getDocUri('node_modules/@types/lodash/index.d.ts');
    await testReferences(docUri, position(16, 12), [
      location(docUri, 16, 12, 16, 13),
      location(lodashDtsUri, 243, 9, 243, 10),
      location(lodashDtsUri, 246, 12, 246, 13)
    ]);
  });

  it('finds references for Vue#data', async () => {
    const vueOptionsDtsUri = getDocUri('node_modules/vue/types/options.d.ts');
    await testReferences(docUri, position(21, 2), [
      location(vueOptionsDtsUri, 58, 2, 58, 6),
      location(docUri, 21, 2, 21, 6)
    ]);
  });

  it('finds references for imported Vue files', async () => {
    const itemUri = getDocUri('client/references/Basic.Item.vue');
    await testReferences(docUri, position(20, 16), [
      location(docUri, 17, 7, 17, 11),
      location(itemUri, 5, 7, 5, 14)
    ]);
  });
});

async function testReferences(docUri: vscode.Uri, position: vscode.Position, expectedLocations: vscode.Location[]) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeReferenceProvider',
    docUri,
    position
  )) as vscode.Location[];

  expectedLocations.forEach(el => {
    assert.ok(
      result.some(l => {
        return l.range.isEqual(el.range) && l.uri.path === el.uri.path;
      })
    );
  });
}
