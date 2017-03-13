import * as path from 'path';

import { languages, workspace, ExtensionContext, IndentAction } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Range, RequestType } from 'vscode-languageclient';
import { EMPTY_ELEMENTS } from './htmlEmptyTagsShared';
import { activateColorDecorations } from './colorDecorators';

namespace ColorSymbolRequest {
  export const type: RequestType<string, Range[], any, any> = new RequestType('css/colorSymbols');
}

export function activate(context: ExtensionContext) {

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('client', 'server', 'htmlServerMain.js'));
  // The debug options for the server
  let debugOptions = { execArgv: ['--nolazy', '--debug=6005'] };

  // If the extension is launch in debug mode the debug server options are use
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  let documentSelector = ['vue'];
  let embeddedLanguages = { css: true, javascript: true };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: ['html', 'css', 'javascript'], // the settings to synchronize
    },
    initializationOptions: {
      embeddedLanguages
    }
  };

  // Create the language client and start the client.
  let client = new LanguageClient('vue', 'Vue Language Server', serverOptions, clientOptions, true);
  let disposable = client.start();
  context.subscriptions.push(disposable);
  client.onReady().then(() => {
    let colorRequestor = (uri: string) => {
      return client.sendRequest(ColorSymbolRequest.type, uri).then(ranges => ranges.map(client.protocol2CodeConverter.asRange));
    };
    let isDecoratorEnabled = (languageId: string) => {
      return workspace.getConfiguration().get<boolean>('css.colorDecorators.enable');
    };
    let disposable = activateColorDecorations(colorRequestor, { html: true, handlebars: true, razor: true }, isDecoratorEnabled);
    context.subscriptions.push(disposable);
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