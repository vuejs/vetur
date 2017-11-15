import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';
import { languages, workspace, ExtensionContext, IndentAction } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  Range,
  RequestType,
  RevealOutputChannelOn
} from 'vscode-languageclient';
import { activateColorDecorations } from './colorDecorators';
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

namespace ColorSymbolRequest {
  export const type: RequestType<string, Range[], any, any> = new RequestType('vue/colorSymbols');
}

export function activate(context: ExtensionContext) {
  /**
   * Custom Block Grammar generation command
   */
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.generateGrammar', () => {
      const customBlocks: { [k: string]: string } = workspace.getConfiguration().get('vetur.grammar.customBlocks');
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
  const serverModule = require.resolve('vue-language-server');
  const debugServerModule = context.asAbsolutePath(path.join('server', 'dist', 'vueServerMain.js'));
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6005'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: debugServerModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const documentSelector = ['vue'];
  const config = workspace.getConfiguration();

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      // the settings to synchronize
      configurationSection: ['vetur', 'html', 'javascript', 'typescript', 'prettier', 'stylusSupremacy']
    },
    initializationOptions: {
      config
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  // Create the language client and start the client.
  const client = new LanguageClient('vue', 'Vue Language Server', serverOptions, clientOptions);
  const disposable = client.start();
  context.subscriptions.push(disposable);
  const colorRequestor = (uri: string) => {
    return client
      .sendRequest(ColorSymbolRequest.type, uri)
      .then(ranges => ranges.map(client.protocol2CodeConverter.asRange));
  };
  const isDecoratorEnabled = () => {
    return workspace.getConfiguration().get<boolean>('vetur.colorDecorators.enable');
  };
  client.onReady().then(() => {
    context.subscriptions.push(activateColorDecorations(colorRequestor, { vue: true }, isDecoratorEnabled));
  });

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
