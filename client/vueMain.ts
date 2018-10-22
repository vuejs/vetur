import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { generateGrammarCommandHandler } from './grammar';
import { registerLanguageConfigurations } from './languages';
import { initializeLanguageClient } from './client';

export function activate(context: vscode.ExtensionContext) {
  /**
   * Custom Block Grammar generation command
   */
  context.subscriptions.push(
    vscode.commands.registerCommand('vetur.generateGrammar', generateGrammarCommandHandler(context.extensionPath))
  );

  registerLanguageConfigurations();

  /**
   * Vue Language Server Initialization
   */

  const serverModule = context.asAbsolutePath(path.join('server', 'dist', 'vueServerMain.js'));
  const client = initializeLanguageClient(serverModule);
  context.subscriptions.push(client.start());

  client.onReady().then(() => {
    registerCustomClientNotificationHandlers(client);
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
}
