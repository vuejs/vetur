import * as vscode from 'vscode';
import {
  LanguageClient,
  RevealOutputChannelOn,
  ServerOptions,
  TransportKind,
  LanguageClientOptions
} from 'vscode-languageclient';
import { resolve } from 'path';
import { existsSync } from 'fs';

export function initializeLanguageClient(vlsModulePath: string): LanguageClient {
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6005', '--prof'] };

  const documentSelector = ['vue'];
  const config = vscode.workspace.getConfiguration();

  let serverPath;

  const devVlsPackagePath = config.get('vetur.dev.vlsPath', '');
  if (devVlsPackagePath && devVlsPackagePath !== '' && existsSync(devVlsPackagePath)) {
    serverPath = resolve(devVlsPackagePath, 'dist/vueServerMain.js');
  } else {
    serverPath = vlsModulePath;
  }

  const serverOptions: ServerOptions = {
    run: { runtime: 'node', module: serverPath, transport: TransportKind.ipc },
    debug: { runtime: 'node', module: serverPath, transport: TransportKind.ipc, options: debugOptions }
  };

  const watcher = (() => {
    const innerWatcher = vscode.workspace.createFileSystemWatcher('{**/*.js,**/*.ts}', true, false, true);
    return {
      get ignoreCreateEvents() {
        return innerWatcher.ignoreCreateEvents;
      },
      set ignoreCreateEvents(v) {
        innerWatcher.ignoreCreateEvents = v;
      },
      get ignoreChangeEvents() {
        return innerWatcher.ignoreChangeEvents;
      },
      set ignoreChangeEvents(v) {
        innerWatcher.ignoreChangeEvents = v;
      },
      get ignoreDeleteEvents() {
        return innerWatcher.ignoreDeleteEvents;
      },
      set ignoreDeleteEvents(v) {
        innerWatcher.ignoreDeleteEvents = v;
      },
      onDidCreate(listener: (e: vscode.Uri) => any, thisArgs?: any, disposables?: vscode.Disposable[]) {
        innerWatcher.onDidChange(
          function(v: vscode.Uri) {
            if (v.fsPath.includes('/node_modules/')) {
              return;
            }
            listener(v);
          },
          thisArgs,
          disposables
        );
      },
      onDidChange(listener: (e: vscode.Uri) => any, thisArgs?: any, disposables?: vscode.Disposable[]) {
        innerWatcher.onDidChange(
          function(v: vscode.Uri) {
            if (v.fsPath.includes('/node_modules/')) {
              return;
            }
            listener(v);
          },
          thisArgs,
          disposables
        );
      },
      onDidDelete(listener: (e: vscode.Uri) => any, thisArgs?: any, disposables?: vscode.Disposable[]) {
        innerWatcher.onDidChange(
          function(v: vscode.Uri) {
            if (v.fsPath.includes('/node_modules/')) {
              return;
            }
            listener(v);
          },
          thisArgs,
          disposables
        );
      },
      dispose() {
        innerWatcher.dispose();
      }
    } as vscode.FileSystemWatcher;
  })();

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: ['vetur', 'emmet', 'html', 'javascript', 'typescript', 'prettier', 'stylusSupremacy'],
      fileEvents: watcher
    },
    initializationOptions: {
      config
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  return new LanguageClient('vetur', 'Vue Language Server', serverOptions, clientOptions);
}
