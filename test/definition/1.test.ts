import * as vscode from 'vscode';
import { testDefinition, getDocUri, activateLS } from '../helper';

describe('Should find definition', () => {
  before('activate', () => activateLS());

  const docUri = getDocUri('client/components/Counter.vue');

  it('find definition for this.msg', async () => {
    await testDefinition(docUri, new vscode.Position(32, 24), {
      range: new vscode.Range(new vscode.Position(22, 6), new vscode.Position(22, 9)),
      uri: docUri
    });
  });

  it('find definition for lodash', async () => {
    const lodashDtsUri = getDocUri('node_modules/@types/lodash/index.d.ts');
    await testDefinition(docUri, new vscode.Position(16, 12), {
      range: new vscode.Range(new vscode.Position(246, 12), new vscode.Position(246, 13)),
      uri: lodashDtsUri
    });
  });

  it('find definition for Vue#data', async () => {
    const vueOptionsDtsUri = getDocUri('node_modules/vue/types/options.d.ts');
    await testDefinition(docUri, new vscode.Position(20, 2), {
      range: new vscode.Range(new vscode.Position(58, 2), new vscode.Position(58, 6)),
      uri: vueOptionsDtsUri
    });
  });

  it('find definition for imported Vue files', async () => {
    await testDefinition(docUri, new vscode.Position(17, 7), {
      range: new vscode.Range(new vscode.Position(5, 0), new vscode.Position(7, 1)),
      uri: getDocUri('client/components/Item.vue')
    });
  });
});
