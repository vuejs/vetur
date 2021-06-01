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
} from 'vscode-languageserver/node';

import { Duplex } from 'stream';
import { VLS } from 'vls';
import { getInitParams } from '../initParams';
import fs from 'fs';
import { URI } from 'vscode-uri';
import glob from 'glob';
import path from 'path';
import chalk from 'chalk';
import { codeFrameColumns, SourceLocation } from '@babel/code-frame';
import { Range } from 'vscode-languageclient';

export type LogLevel = typeof logLevels[number];
export const logLevels = ['ERROR', 'WARN', 'INFO', 'HINT'] as const;
const logLevel2Severity = {
  ERROR: DiagnosticSeverity.Error,
  WARN: DiagnosticSeverity.Warning,
  INFO: DiagnosticSeverity.Information,
  HINT: DiagnosticSeverity.Hint
};

export async function diagnostics(workspace: string | null, paths: string[], logLevel: LogLevel) {
  console.log('====================================');
  console.log('Getting Vetur diagnostics');
  let workspaceUri;

  if (workspace) {
    const absPath = path.resolve(process.cwd(), workspace);
    console.log(`Loading Vetur in workspace path: ${chalk.green(absPath)}`);
    workspaceUri = URI.file(absPath);
  } else {
    console.log(`Loading Vetur in current directory: ${chalk.green(process.cwd())}`);
    workspaceUri = URI.file(process.cwd());
  }

  const errCount = await getDiagnostics(workspaceUri, paths, logLevel2Severity[logLevel]);
  console.log('====================================');

  if (errCount === 0) {
    console.log(chalk.green(`VTI found no error`));
    process.exit(0);
  } else {
    console.log(chalk.red(`VTI found ${errCount} ${errCount === 1 ? 'error' : 'errors'}`));
    process.exit(1);
  }
}

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

async function getDiagnostics(workspaceUri: URI, paths: string[], severity: DiagnosticSeverity) {
  const clientConnection = await prepareClientConnection(workspaceUri);

  let files: string[];
  if (paths.length === 0) {
    files = glob.sync('**/*.vue', { cwd: workspaceUri.fsPath, ignore: ['node_modules/**'] });
  } else {
    // Could use `flatMap` once available:
    const listOfPaths = paths.map(inputPath => {
      const absPath = path.resolve(workspaceUri.fsPath, inputPath);

      if (fs.lstatSync(absPath).isFile()) {
        return [inputPath];
      }

      const directory = URI.file(absPath);
      const directoryFiles = glob.sync('**/*.vue', { cwd: directory.fsPath, ignore: ['node_modules/**'] });
      return directoryFiles.map(f => path.join(inputPath, f));
    });

    files = listOfPaths.reduce((acc: string[], paths) => [...acc, ...paths], []);
  }

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
      res = res.filter(r => r.source !== 'eslint-plugin-vue').filter(r => r.severity && r.severity <= severity);
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
      console.error(err.stack);
    }
  }

  return errCount;
}
