import * as vscode from 'vscode';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getGeneratedGrammar } from '../grammar';

export function generateGrammarCommandHandler(extensionPath: string) {
  return () => {
    try {
      const customBlocks: { [k: string]: string } =
        vscode.workspace.getConfiguration().get('vetur.grammar.customBlocks') || {};
      const generatedGrammar = getGeneratedGrammar(
        resolve(extensionPath, 'syntaxes/vue.tmLanguage.json'),
        customBlocks
      );
      writeFileSync(resolve(extensionPath, 'syntaxes/vue-generated.json'), generatedGrammar, 'utf-8');
      vscode.window.showInformationMessage('Successfully generated vue grammar. Reload VS Code to enable it.');
    } catch (e) {
      vscode.window.showErrorMessage(
        'Failed to generate vue grammar. `vetur.grammar.customBlocks` contain invalid language values'
      );
    }
  };
}
