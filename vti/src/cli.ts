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
import fs from 'fs';
import { URI } from 'vscode-uri';
import glob from 'glob';
import path from 'path';
import chalk from 'chalk';
import { codeFrameColumns, SourceLocation } from '@babel/code-frame';
import { Range } from 'vscode-languageclient';

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

      console.log('Vetur initialized');
      console.log('====================================');

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

function range2Location(range: Range): SourceLocation {
  return {
    start: {
      line: range.start.line + 1,
      column: range.start.character + 1
    },
    end: {
      line: range.end.line + 1,
      column: range.end.character + 1
    }
  };
}

async function getDiagnostics(workspaceUri: URI) {
  const clientConnection = await prepareClientConnection(workspaceUri);

  const files = glob.sync('**/*.vue', { cwd: workspaceUri.fsPath, ignore: ['node_modules/**'] });

  if (files.length === 0) {
    console.log('No input files');
    return 0;
  }

  console.log('');
  console.log('Getting diagnostics from: ', files, '\n');

  const absFilePaths = files.map(f => path.resolve(workspaceUri.fsPath, f));

  let errCount = 0;

  for (const absFilePath of absFilePaths) {
    const fileText = fs.readFileSync(absFilePath, 'utf-8');
    await clientConnection.sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: {
        languageId: 'vue',
        uri: URI.file(absFilePath).toString(),
        version: 1,
        text: fileText
      }
    });

    try {
      let res = (await clientConnection.sendRequest('$/getDiagnostics', {
        uri: URI.file(absFilePath).toString()
      })) as Diagnostic[];
      /**
       * Ignore eslint errors for now
       */
      res = res.filter(r => r.source !== 'eslint-plugin-vue');
      if (res.length > 0) {
        res.forEach(d => {
          const location = range2Location(d.range);
          console.log(
            `${chalk.green('File')} : ${chalk.green(absFilePath)}:${location.start.line}:${location.start.column}`
          );
          if (d.severity === DiagnosticSeverity.Error) {
            console.log(`${chalk.red('Error')}: ${d.message.trim()}`);
            errCount++;
          } else {
            console.log(`${chalk.yellow('Warn')} : ${d.message.trim()}`);
          }
          console.log(codeFrameColumns(fileText, location));
        });
        console.log('');
      }
    } catch (err) {
      console.log(err);
    }
  }

  return errCount;
}

function getVersion(): string {
  const { version }: { version: string } = require('../package.json');
  return `v${version}`;
}

(async () => {
  const myArgs = process.argv.slice(2);

  // vls diagnostics
  if (myArgs.length > 0 && myArgs[0] === 'diagnostics') {
    console.log('====================================');
    console.log('Getting Vetur diagnostics');
    let workspaceUri;

    if (myArgs[1]) {
      const absPath = path.resolve(process.cwd(), myArgs[1]);
      console.log(`Loading Vetur in workspace path: ${chalk.green(absPath)}`);
      workspaceUri = URI.file(absPath);
    } else {
      console.log(`Loading Vetur in current directory: ${chalk.green(process.cwd())}`);
      workspaceUri = URI.file(process.cwd());
    }

    const errCount = await getDiagnostics(workspaceUri);
    console.log('====================================');

    if (errCount === 0) {
      console.log(chalk.green(`VTI found no error`));
      process.exit(0);
    } else {
      console.log(chalk.red(`VTI found ${errCount} ${errCount === 1 ? 'error' : 'errors'}`));
      process.exit(1);
    }
  } else if (myArgs.length > 0 && myArgs[0] === 'version') {
    console.log(getVersion());
  } else {
    // no args or wrong first args
    console.log('Vetur Terminal Interface');
    console.log('');
    console.log('Usage:');
    console.log('');
    console.log('  vti diagnostics ---- Print all diagnostics');
    console.log('  vti version     ---- Show VTI version');
    console.log('');
  }
})().catch(err => {
  console.error(`VTI operation failed with error: ${err}`);
  process.exit(1);
});
