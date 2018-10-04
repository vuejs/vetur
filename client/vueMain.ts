import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';
import { languages, workspace, ExtensionContext, IndentAction } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  RevealOutputChannelOn
} from 'vscode-languageclient';
import { getGeneratedGrammar } from './grammar';

const EMPTY_ELEMENTS: string[] = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'menuitem',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
];

export function activate(context: ExtensionContext) {
  /**
   * Custom Block Grammar generation command
   */
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.generateGrammar', () => {
      const customBlocks: { [k: string]: string } =
        workspace.getConfiguration().get('vetur.grammar.customBlocks') || {};
      try {
        const generatedGrammar = getGeneratedGrammar(
          path.resolve(context.extensionPath, 'syntaxes/vue.json'),
          customBlocks
        );
        fs.writeFileSync(path.resolve(context.extensionPath, 'syntaxes/vue-generated.json'), generatedGrammar, 'utf-8');
        vscode.window.showInformationMessage('Successfully generated vue grammar. Reload VS Code to enable it.');
      } catch (e) {
        vscode.window.showErrorMessage(
          'Failed to generate vue grammar. `vetur.grammar.customBlocks` contain invalid language values'
        );
      }
    })
  );

  /**
   * Vue Language Server Initialization
   */
  const serverModule = context.asAbsolutePath(path.join('server', 'dist', 'vueServerMain.js'));
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6005'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const documentSelector = ['vue'];
  const config = workspace.getConfiguration();

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: ['vetur', 'emmet', 'html', 'javascript', 'typescript', 'prettier', 'stylusSupremacy'],
      fileEvents: vscode.workspace.createFileSystemWatcher('{**/*.js,**/*.ts}', true, false, true)
    },
    initializationOptions: {
      config
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  const client = new LanguageClient('vetur', 'Vue Language Server', serverOptions, clientOptions);
  const disposable = client.start();
  context.subscriptions.push(disposable);

  languages.setLanguageConfiguration('vue-html', {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
    onEnterRules: [
      {
        beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>$/i,
        action: { indentAction: IndentAction.IndentOutdent }
      },
      {
        beforeText: new RegExp(`<(?!(?:${EMPTY_ELEMENTS.join('|')}))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
        action: { indentAction: IndentAction.Indent }
      }
    ]
  });
}

