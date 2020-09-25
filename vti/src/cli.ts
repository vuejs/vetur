import * as path from 'path';
import { URI } from 'vscode-uri';
import * as chalk from 'chalk';
import Worker from 'jest-worker';
import { glob } from 'glob';
import * as os from 'os';
import { chunk } from 'lodash';

interface VTIProcess { getDiagnostics(workspaceUri: URI, files: string[]): Promise<number>; }
type VTIWorker = Worker & VTIProcess;

const SMALL_PROJECT_SIZE = 20;

const getInputGroups = (arr: string[], cpus: number) => {
  const size = Math.ceil(arr.length / cpus);
  return chunk(arr, size);
};

(async () => {
  const myArgs = process.argv.slice(2);

  // vls diagnostics
  if (myArgs.length > 0 && myArgs[0] === 'diagnostics') {
    console.log('====================================');
    console.log('Getting Vetur diagnostics');
    let workspaceUri: URI;

    if (myArgs[1]) {
      const absPath = path.resolve(process.cwd(), myArgs[1]);
      console.log(`Loading Vetur in workspace path: ${chalk.green(absPath)}`);
      workspaceUri = URI.file(absPath);
    } else {
      console.log(`Loading Vetur in current directory: ${chalk.green(process.cwd())}`);
      workspaceUri = URI.file(process.cwd());
    }

    const files = glob.sync('**/*.vue', { cwd: workspaceUri.fsPath, ignore: ['node_modules/**'] });

    if (files.length === 0) {
      console.log('No input files');
      return 0;
    }

    console.log('');
    console.log(`Have ${files.length} files.`);
    console.log('Getting diagnostics from: ', files, '\n');

    const cpus = os.cpus().length - 1;

    const errCount = await (async () => {
      if (files.length > SMALL_PROJECT_SIZE) {
        const worker = new Worker(require.resolve('./process'), {
          numWorkers: cpus,
          exposedMethods: ['getDiagnostics']
        }) as VTIWorker;

        worker.getStdout().on('data', data => {
          process.stdout.write(data.toString('utf-8'));
        });

        return (
          await Promise.all(getInputGroups(files, cpus).map(el => worker.getDiagnostics(workspaceUri, el)))
        ).reduce((sum, el) => sum + el, 0);
      } else {
        const process = require('./process') as VTIProcess;

        return process.getDiagnostics(workspaceUri, files);
      }
    })();

    console.log('====================================');

    if (errCount === 0) {
      console.log(chalk.green(`VTI found no error`));
      process.exit(0);
    } else {
      console.log(chalk.red(`VTI found ${errCount} ${errCount === 1 ? 'error' : 'errors'}`));
      process.exit(1);
    }
  } else {
    // no args or wrong first args
    console.log('Vetur Terminal Interface');
    console.log('');
    console.log('Usage:');
    console.log('');
    console.log('  vti diagnostics ---- Print all diagnostics');
    console.log('');
  }
})().catch(_err => {
  console.error('VTI operation failed');
});
