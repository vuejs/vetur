import * as vscode from 'vscode';
import { LanguageClient, WorkspaceEdit } from 'vscode-languageclient';
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

  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.applyWorkspaceEdits', (args: WorkspaceEdit) => {
      const edit = client.protocol2CodeConverter.asWorkspaceEdit(args)!;
      vscode.workspace.applyEdit(edit);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.chooseTypeScriptRefactoring', (args: any) => {
      client
        .sendRequest<vscode.Command | undefined>('requestCodeActionEdits', args)
        .then(command => command && vscode.commands.executeCommand(command.command, ...command.arguments!));
    })
  );

  registerLanguageConfigurations();

  /**
   * Vue Language Server Initialization
   */

  const serverModule = context.asAbsolutePath(join('server', 'dist', 'vueServerMain.js'));
  const client = initializeLanguageClient(serverModule, globalSnippetDir);
  context.subscriptions.push(client.start());

  client
    .onReady()
    .then(() => {
      registerCustomClientNotificationHandlers(client);
      registerCustomLSPCommands(context, client);
    })
    .catch(e => {
      console.log('Client initialization failed');
    });
}

function registerCustomClientNotificationHandlers(client: LanguageClient) {
  client.onNotification('$/displayInfo', (msg: string) => {
    vscode.window.showInformationMessage(msg);
  });
  client.onNotification('$/displayWarning', (msg: string) => {
    vscode.window.showWarningMessage(msg);
  });
  client.onNotification('$/displayError', (msg: string) => {
    vscode.window.showErrorMessage(msg);
  });
  client.onNotification('$/showVirtualFile', (virtualFileSource: string, prettySourceMap: string) => {
    setVirtualContents(virtualFileSource, prettySourceMap);
  });
}

function registerCustomLSPCommands(context: vscode.ExtensionContext, client: LanguageClient) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.showCorrespondingVirtualFile', generateShowVirtualFileCommand(client))
  );
}
