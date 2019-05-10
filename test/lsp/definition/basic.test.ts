import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { location, position, sameLineLocation, getDocUri } from '../util';

describe('Should find definition', () => {
  const docUri = getDocUri('client/definition/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds definition for this.msg', async () => {
    await testDefinition(docUri, position(32, 23), sameLineLocation(docUri, 22, 6, 9));
  });

  it('finds definition for lodash', async () => {
    const lodashDtsUri = getDocUri('node_modules/@types/lodash/index.d.ts');
    await testDefinition(docUri, position(16, 12), sameLineLocation(lodashDtsUri, 246, 12, 13));
  });

  it('finds definition for Vue#data', async () => {
    const vueOptionsDtsUri = getDocUri('node_modules/vue/types/options.d.ts');
    await testDefinition(docUri, position(20, 2), sameLineLocation(vueOptionsDtsUri, 73, 2, 6));
  });

  it('finds definition for imported Vue files', async () => {
    const itemUri = getDocUri('client/definition/Basic.Item.vue');
    await testDefinition(docUri, position(17, 7), location(itemUri, 5, 0, 7, 1));
  });
});

async function testDefinition(docUri: vscode.Uri, position: vscode.Position, expectedLocation: vscode.Location) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDefinitionProvider',
    docUri,
    position
  )) as vscode.Location[];

  assert.ok(result[0].range.isEqual(expectedLocation.range));
  assert.equal(result[0].uri.fsPath, expectedLocation.uri.fsPath);
}
