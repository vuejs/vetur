import vscode from 'vscode';
import { LanguageClient, Range } from 'vscode-languageclient/node';
import { generateGrammarCommandHandler } from './commands/generateGrammarCommand';
import { registerLanguageConfigurations } from './languages';
import { initializeLanguageClient } from './client';
import { join } from 'path';
import {
  setVirtualContents,
  registerVeturTextDocumentProviders,
  generateShowVirtualFileCommand
} from './commands/virtualFileCommand';
import { getGlobalSnippetDir } from './userSnippetDir';
import { generateOpenUserScaffoldSnippetFolderCommand } from './commands/openUserScaffoldSnippetFolderCommand';
import { generateDoctorCommand } from './commands/doctorCommand';

export async function activate(context: vscode.ExtensionContext) {
  const isInsiders = vscode.env.appName.includes('Insiders');
  const globalSnippetDir = getGlobalSnippetDir(isInsiders);

  /**
   * Virtual file display command for debugging template interpolation
   */
  context.subscriptions.push(await registerVeturTextDocumentProviders());

  /**
   * Custom Block Grammar generation command
   */
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.generateGrammar', generateGrammarCommandHandler(context.extensionPath))
  );

  /**
   * Open custom snippet folder
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vetur.openUserScaffoldSnippetFolder',
      generateOpenUserScaffoldSnippetFolderCommand(globalSnippetDir)
    )
  );

  registerLanguageConfigurations();

  /**
   * Vue Language Server Initialization
   */

  const serverModule = context.asAbsolutePath(join('server', 'dist', 'vueServerMain.js'));
  const client = initializeLanguageClient(serverModule, globalSnippetDir);
  context.subscriptions.push(client.start());

  const promise = client
    .onReady()
    .then(() => {
      registerCustomClientNotificationHandlers(client);
      registerCustomLSPCommands(context, client);
      registerRestartVLSCommand(context, client);

      if (context.extensionMode === vscode.ExtensionMode.Test) {
        return {
          /**@internal expose only for testing */
          sendRequest: client.sendRequest.bind(client)
        };
      }
    })
    .catch((e: Error) => {
      console.error(e.stack);
      console.log('Client initialization failed');
    });

  return displayInitProgress(promise);
}

async function displayInitProgress<T = void>(promise: Promise<T>) {
  return vscode.window.withProgress(
    {
      title: 'Vetur initialization',
      location: vscode.ProgressLocation.Window
    },
    () => promise
  );
}

function registerRestartVLSCommand(context: vscode.ExtensionContext, client: LanguageClient) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.restartVLS', () =>
      displayInitProgress(
        client
          .stop()
          .then(() => client.start())
          .then(() => client.onReady())
      )
    )
  );
}

function registerCustomClientNotificationHandlers(client: LanguageClient) {
  client.onNotification('$/showVirtualFile', (virtualFileSource: string, prettySourceMap: string) => {
    setVirtualContents(virtualFileSource, prettySourceMap);
  });

  // underline with ref value
  const refTokenDecorationType = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline' });
  const refTokenFiles = new Map<string, vscode.Range[]>();

  function underlineRefTokens() {
    if (!vscode.workspace.getConfiguration().get('vetur.underline.refValue')) {
      return;
    }
    if (!vscode.window.activeTextEditor) {
      return;
    }
    const tokens = refTokenFiles.get(vscode.window.activeTextEditor?.document.uri.toString());
    if (!tokens) {
      return;
    }
    vscode.window.activeTextEditor.setDecorations(refTokenDecorationType, tokens);
  }

  client.onNotification('$/refTokens', ({ uri, tokens }) => {
    refTokenFiles.set(
      client.protocol2CodeConverter.asUri(uri).toString(),
      client.protocol2CodeConverter.asRanges(tokens)
    );
    underlineRefTokens();
  });
  vscode.window.onDidChangeActiveTextEditor(() => underlineRefTokens());
}

function registerCustomLSPCommands(context: vscode.ExtensionContext, client: LanguageClient) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.showCorrespondingVirtualFile', generateShowVirtualFileCommand(client)),
    vscode.commands.registerCommand('vetur.showOutputChannel', () => client.outputChannel.show()),
    vscode.commands.registerCommand('vetur.showDoctorInfo', generateDoctorCommand(client))
  );
}
