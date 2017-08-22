import * as path from 'path';

import { languages, workspace, ExtensionContext, IndentAction } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Range, RequestType, RevealOutputChannelOn } from 'vscode-languageclient';
import { EMPTY_ELEMENTS } from './htmlEmptyTagsShared';
import { activateColorDecorations } from './colorDecorators';

namespace ColorSymbolRequest {
  export const type: RequestType<string, Range[], any, any> = new RequestType('vue/colorSymbols');
}

export function activate(context: ExtensionContext) {

  const serverModule = require.resolve('vue-language-server');
  const debugServerModule = context.asAbsolutePath(path.join('server', 'dist', 'vueServerMain.js'));
  const debugOptions = { execArgv: ['--nolazy', '--debug=6005'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: debugServerModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const documentSelector = ['vue'];
  const veturConfig = workspace.getConfiguration('vetur');

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: ['vetur'] // the settings to synchronize
    },
    initializationOptions: {
      veturConfig
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  // Create the language client and start the client.
  const client = new LanguageClient('vue', 'Vue Language Server', serverOptions, clientOptions);
  const disposable = client.start();
  context.subscriptions.push(disposable);
  const colorRequestor = (uri: string) => {
    return client.sendRequest(ColorSymbolRequest.type, uri).then(ranges => ranges.map(client.protocol2CodeConverter.asRange));
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
    ],
  });
}
