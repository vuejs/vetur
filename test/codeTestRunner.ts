import * as path from 'path';
import * as fs from 'fs';
import * as $ from 'shelljs';
import * as minimist from 'minimist';

import { downloadAndUnzipVSCode, runTests } from 'vscode-test';

console.log('### Vetur Integration Test ###');
console.log('');

const EXT_ROOT = path.resolve(__dirname, '../../');

async function run(execPath: string, testWorkspaceRelativePath: string, mochaArgs: any): Promise<number> {
  const testWorkspace = path.resolve(EXT_ROOT, testWorkspaceRelativePath, 'fixture');
  const extTestPath = path.resolve(EXT_ROOT, 'dist', testWorkspaceRelativePath);
  const userDataDir = path.resolve(EXT_ROOT, testWorkspaceRelativePath, 'data-dir');

  const args = [testWorkspace, '--locale=en', '--disable-extensions', `--user-data-dir=${userDataDir}`];

  console.log(`Test folder: ${path.join('dist', testWorkspaceRelativePath)}`);
  console.log(`Workspace:   ${testWorkspaceRelativePath}`);
  if (fs.existsSync(userDataDir)) {
    console.log(`Data dir:    ${userDataDir}`);
  }

  return await runTests({
    vscodeExecutablePath: execPath,
    extensionDevelopmentPath: EXT_ROOT,
    extensionTestsPath: extTestPath,
    extensionTestsEnv: mochaArgs,
    launchArgs: args
  });
}

async function runAllTests(execPath: string) {
  const testDirs = fs.readdirSync(path.resolve(EXT_ROOT, './test')).filter(p => !p.includes('.'));

  const argv = minimist(process.argv.slice(2));
  const targetDir = argv._[0];

  const mochaArgs = {};
  Object.keys(argv)
    .filter(k => k.match(/^[A-Za-z]/))
    .forEach(k => {
      mochaArgs[`MOCHA_${k}`] = argv[k];
    });

  if (targetDir && testDirs.indexOf(targetDir) !== -1) {
    try {
      installMissingDependencies(path.resolve(path.resolve(EXT_ROOT, `./test/${targetDir}/fixture`)));
      await run(execPath, `test/${targetDir}`, mochaArgs);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  } else {
    for (const dir of testDirs) {
      try {
        installMissingDependencies(path.resolve(path.resolve(EXT_ROOT, `./test/${dir}/fixture`)));
        await run(execPath, `test/${dir}`, mochaArgs);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  }
}

function installMissingDependencies(fixturePath: string) {
  const pkgPath = path.resolve(fixturePath, 'package.json');
  const nodeModulesPath = path.resolve(fixturePath, 'node_modules');

  if (fs.existsSync(pkgPath) && !fs.existsSync(nodeModulesPath)) {
    $.exec('yarn install', { cwd: fixturePath });
    console.log('Yarn: installed dependencies');
  }
}

async function go() {
  const execPath = await downloadAndUnzipVSCode('stable');
  await runAllTests(execPath);
}

go()
  .then(() => {
    console.log('All done');
  })
  .catch(err => {});
