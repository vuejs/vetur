import * as vscode from 'vscode';
import { testDefinition, getDocUri } from '../helper';

describe('Should find definition', () => {
  const docUri = getDocUri('client/components/Counter.vue');

  it('find definition', async () => {
    await testDefinition(docUri, new vscode.Position(31, 24), {
      range: new vscode.Range(new vscode.Position(21, 6), new vscode.Position(21, 9)),
      uri: docUri
    });
  });
});
