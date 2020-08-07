import * as assert from 'assert';
import * as vscode from 'vscode';
import { showFile } from '../../../editorHelper';
import { position, sameLineLocation } from '../../../util';
import { getDocUri } from '../../path';

describe('Should find definition', () => {
  const docUri = getDocUri('definition/Basic.vue');

  it('finds definition for child tag', async () => {
    const tagUri = getDocUri('definition/Child.vue');
    await testDefinition(docUri, position(2, 5), sameLineLocation(tagUri, 0, 0, 0));
  });

  it('finds definition for test-bar tag', async () => {
    const tagUri = getDocUri('definition/TestBar.vue');
    await testDefinition(docUri, position(3, 5), sameLineLocation(tagUri, 0, 0, 0));
  });

  it('finds definition for TestBar tag', async () => {
    const tagUri = getDocUri('definition/TestBar.vue');
    await testDefinition(docUri, position(4, 5), sameLineLocation(tagUri, 0, 0, 0));
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
