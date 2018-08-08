import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../../helper';

describe('Should find definition', () => {
  const docUri = getDocUri('client/definition/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('finds definition for this.msg', async () => {
    await testDefinition(docUri, new vscode.Position(32, 24), {
      range: new vscode.Range(new vscode.Position(22, 6), new vscode.Position(22, 9)),
      uri: docUri
    });
  });

  it('finds definition for lodash', async () => {
    const lodashDtsUri = getDocUri('node_modules/@types/lodash/index.d.ts');
    await testDefinition(docUri, new vscode.Position(16, 12), {
      range: new vscode.Range(new vscode.Position(246, 12), new vscode.Position(246, 13)),
      uri: lodashDtsUri
    });
  });

  it('finds definition for Vue#data', async () => {
    const vueOptionsDtsUri = getDocUri('node_modules/vue/types/options.d.ts');
    await testDefinition(docUri, new vscode.Position(20, 2), {
      range: new vscode.Range(new vscode.Position(58, 2), new vscode.Position(58, 6)),
      uri: vueOptionsDtsUri
    });
  });

  it('finds definition for imported Vue files', async () => {
    await testDefinition(docUri, new vscode.Position(17, 7), {
      range: new vscode.Range(new vscode.Position(5, 0), new vscode.Position(7, 1)),
      uri: getDocUri('client/definition/Basic.Item.vue')
    });
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
  assert.equal(result[0].uri.path, expectedLocation.uri.path);
}
