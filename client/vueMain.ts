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
import {
  DocumentColorRequest, DocumentColorParams, ColorPresentationRequest, ColorPresentationParams
} from 'vscode-languageserver-protocol/lib/protocol.colorProvider.proposed';

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
  const isDecoratorEnabled = workspace.getConfiguration().get<boolean>('vetur.colorDecorators.enable');

  if (isDecoratorEnabled) {
    client.onReady().then(registerColorProvider);
  }

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

  function registerColorProvider() {
    const colorSubscription = languages.registerColorProvider(documentSelector, {
      provideDocumentColors(doc) {
        const params: DocumentColorParams = {
          textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(doc)
        };
        return client.sendRequest(DocumentColorRequest.type, params)
          .then(symbols => symbols.map(symbol => {
            const range = client.protocol2CodeConverter.asRange(symbol.range);
            const color = new vscode.Color(symbol.color.red, symbol.color.green, symbol.color.blue, symbol.color.alpha);
            return new vscode.ColorInformation(range, color);
          }));
      },
      provideColorPresentations(color, context) {
        const params: ColorPresentationParams = {
          textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(context.document),
          color,
          range: client.code2ProtocolConverter.asRange(context.range)
        };
        return client.sendRequest(ColorPresentationRequest.type, params)
          .then(presentations => presentations.map(p => {
            const presentation = new vscode.ColorPresentation(p.label);
            presentation.textEdit =
              p.textEdit && client.protocol2CodeConverter.asTextEdit(p.textEdit);
            presentation.additionalTextEdits =
              p.additionalTextEdits && client.protocol2CodeConverter.asTextEdits(p.additionalTextEdits);
            return presentation;
          }));
      }
    });
    context.subscriptions.push(colorSubscription);
  }
}

