import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, location, sameLineLocation, getDocUri } from '../util';

describe('Should find references', () => {
  const docUri = getDocUri('client/references/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
    // Wait a bit more for references to load
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds references for this.msg', async () => {
    await testReferences(docUri, position(33, 23), [
      sameLineLocation(docUri, 23, 6, 9),
      sameLineLocation(docUri, 33, 23, 26)
    ]);
  });

  it('finds references for lodash', async () => {
    const lodashDtsUri = getDocUri('node_modules/@types/lodash/index.d.ts');
    await testReferences(docUri, position(16, 12), [
      location(docUri, 16, 12, 16, 13),
      sameLineLocation(lodashDtsUri, 243, 9, 10),
      sameLineLocation(lodashDtsUri, 246, 12, 13)
    ]);
  });

  it('finds references for Vue#data', async () => {
    const vueOptionsDtsUri = getDocUri('node_modules/vue/types/options.d.ts');
    await testReferences(docUri, position(21, 2), [
      sameLineLocation(vueOptionsDtsUri, 73, 2, 6),
      sameLineLocation(docUri, 21, 2, 6)
    ]);
  });

  it('finds references for imported Vue files', async () => {
    const itemUri = getDocUri('client/references/Basic.Item.vue');
    await testReferences(docUri, position(20, 16), [
      sameLineLocation(docUri, 17, 7, 11),
      sameLineLocation(itemUri, 5, 7, 14)
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
        return l.range.isEqual(el.range) && l.uri.fsPath === el.uri.fsPath;
      })
    );
  });
}
