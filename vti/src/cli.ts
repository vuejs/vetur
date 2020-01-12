import {
  InitializeParams,
  InitializeRequest,
  InitializeResult,
  createProtocolConnection,
  StreamMessageReader,
  StreamMessageWriter,
  Logger,
  DidOpenTextDocumentNotification,
  Diagnostic,
  DiagnosticSeverity
} from 'vscode-languageserver-protocol';
import { createConnection } from 'vscode-languageserver';
import { Duplex } from 'stream';
import { VLS } from 'vue-language-server';
import { params } from './initParams';
import * as fs from 'fs';
import Uri from 'vscode-uri';
import * as glob from 'glob';
import * as path from 'path';
import * as chalk from 'chalk';

class NullLogger implements Logger {
  error(_message: string): void {}
  warn(_message: string): void {}
  info(_message: string): void {}
  log(_message: string): void {}
}

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit('data', chunk);
    done();
  }

  _read(_size: number) {}
}

async function prepareClientConnection(workspaceUri: Uri) {
  const up = new TestStream();
  const down = new TestStream();
  const logger = new NullLogger();

  const clientConnection = createProtocolConnection(new StreamMessageReader(down), new StreamMessageWriter(up), logger);

  const serverConnection = createConnection(new StreamMessageReader(up), new StreamMessageWriter(down));
  const vls = new VLS(serverConnection as any);

  serverConnection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
      await vls.init(params);

      console.log('Vetur initialized');

      return {
        capabilities: vls.capabilities
      };
    }
  );

  vls.listen();
  clientConnection.listen();

  const init: InitializeParams = {
    rootPath: workspaceUri.fsPath,
    rootUri: workspaceUri.toString(),
    ...params
  } as InitializeParams;

  await clientConnection.sendRequest(InitializeRequest.type, init);

  return clientConnection;
}

async function getDiagnostics(workspaceUri: Uri) {
  const clientConnection = await prepareClientConnection(workspaceUri);

  const files = glob.sync('**/*.vue', { cwd: workspaceUri.fsPath });
  const absFilePaths = files.map(f => path.resolve(workspaceUri.fsPath, f));

  console.log('');
  for (const absFilePath of absFilePaths) {
    console.log('');

    await clientConnection.sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: {
        languageId: 'vue',
        uri: Uri.file(absFilePath).toString(),
        version: 1,
        text: fs.readFileSync(absFilePath, 'utf-8')
      }
    });

    try {
      const res = (await clientConnection.sendRequest('$/getDiagnostics', {
        uri: Uri.file(absFilePath).toString()
      })) as Diagnostic[];
      if (res.length > 0) {
        console.log(`${chalk.green('File')} : ${chalk.green(absFilePath)}`);
        res.forEach(d => {
          /**
           * Ignore eslint errors for now
           */
          if (d.source === 'eslint-plugin-vue') {
            return;
          }
          if (d.severity === DiagnosticSeverity.Error) {
            console.log(`${chalk.red('Error')}: ${d.message}`);
          } else {
            console.log(`${chalk.yellow('Error')}: ${d.message}`);
          }
        });
        console.log('');
      }
    } catch (err) {
      console.log(err);
    }
  }
}

const myArgs = process.argv.slice(2);
// no args
if (myArgs.length === 0) {
  console.log('Vetur Terminal Interface');
  console.log('');
  console.log('Usage:');
  console.log('');
  console.log('  vti diagnostics ---- Print all diagnostics');
  console.log('');
}
// vls diagnostics
else if (myArgs[0] === 'diagnostics') {
  console.log('Getting Vetur diagnostics');
  let workspaceUri;

  if (myArgs[1]) {
    console.log(`Loading Vetur in workspace path: ${myArgs[1]}`);
    workspaceUri = Uri.file(myArgs[1]);
  } else {
    console.log(`Loading Vetur in current directory: ${process.cwd()}`);
    workspaceUri = Uri.file(process.cwd());
  }

  console.log('');
  console.log('====================================');
  getDiagnostics(workspaceUri).then(() => {
    console.log('====================================');
  });
}
