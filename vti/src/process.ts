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
  DiagnosticSeverity,
  createConnection,
  ServerCapabilities
} from 'vscode-languageserver';

import { Duplex } from 'stream';
import { VLS } from 'vls';
import { getInitParams } from './initParams';
import * as fs from 'fs';
import { URI } from 'vscode-uri';
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

async function prepareClientConnection(workspaceUri: URI) {
  const up = new TestStream();
  const down = new TestStream();
  const logger = new NullLogger();

  const clientConnection = createProtocolConnection(new StreamMessageReader(down), new StreamMessageWriter(up), logger);

  const serverConnection = createConnection(new StreamMessageReader(up), new StreamMessageWriter(down));
  const vls = new VLS(serverConnection as any);

  serverConnection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
      await vls.init(params);

      console.log(`Vetur ${process.env.JEST_WORKER_ID ?? ''} initialized`);

      return {
        capabilities: vls.capabilities as ServerCapabilities
      };
    }
  );

  vls.listen();
  clientConnection.listen();

  const init = getInitParams(workspaceUri);

  await clientConnection.sendRequest(InitializeRequest.type, init);

  return clientConnection;
}

export async function getDiagnostics(workspaceUri: URI, files: string[]) {
  const clientConnection = await prepareClientConnection(workspaceUri);

  if (files.length === 0) {
    return 0;
  }

  const absFilePaths = files.map(f => path.resolve(workspaceUri.fsPath, f));

  let errCount = 0;

  for (const absFilePath of absFilePaths) {
    await clientConnection.sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: {
        languageId: 'vue',
        uri: URI.file(absFilePath).toString(),
        version: 1,
        text: fs.readFileSync(absFilePath, 'utf-8')
      }
    });

    try {
      const res = (await clientConnection.sendRequest('$/getDiagnostics', {
        uri: URI.file(absFilePath).toString()
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
            console.log(`${chalk.red('Error')}: ${d.message.trim()}`);
            errCount++;
          } else {
            console.log(`${chalk.yellow('Warn')} : ${d.message.trim()}`);
          }
        });
        console.log('');
      }
    } catch (err) {
      console.log(err);
    }
  }

  return errCount;
}
