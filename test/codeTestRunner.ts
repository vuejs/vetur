import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as $ from 'shelljs';
import { downloadAndUnzipVSCode } from 'vscode-test';

console.log('### Vetur Integration Test ###');
console.log('');

const EXT_ROOT = path.resolve(__dirname, '../../');

function runTests(execPath: string, testWorkspaceRelativePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const testWorkspace = path.resolve(EXT_ROOT, testWorkspaceRelativePath, 'fixture');
    const extTestPath = path.resolve(EXT_ROOT, 'dist', testWorkspaceRelativePath);
    const userDataDir = path.resolve(EXT_ROOT, testWorkspaceRelativePath, 'data-dir');

    const args = [
      testWorkspace,
      '--extensionDevelopmentPath=' + EXT_ROOT,
      '--extensionTestsPath=' + extTestPath,
      '--locale=en',
      '--disable-extensions'
    ];
    if (fs.existsSync(userDataDir)) {
      args.push(`--user-data-dir=${userDataDir}`);
    }

    console.log(`Test folder: ${path.join('dist', testWorkspaceRelativePath)}`);
    console.log(`Workspace:   ${testWorkspaceRelativePath}`);
    if (fs.existsSync(userDataDir)) {
      console.log(`Data dir:    ${userDataDir}`);
    }

    const cmd = cp.spawn(execPath, args);

    cmd.stdout.on('data', function(data) {
      const s = data.toString();
      if (!s.includes('update#setState idle')) {
        console.log(s);
      }
    });

    cmd.stderr.on('data', function(data) {
      const s = data.toString();
      if (!s.includes('stty: stdin')) {
        console.log(`Spawn Error: ${data.toString()}`);
      }
    });

    cmd.on('error', function(data) {
      console.log('Test error: ' + data.toString());
    });

    cmd.on('close', function(code) {
      console.log(`Exit code:   ${code}`);

      if (code !== 0) {
        reject('Failed');
      }

      console.log('Done\n');
      resolve(code);
    });
  });
}

async function runAllTests(execPath: string) {
  const testDirs = fs.readdirSync(path.resolve(EXT_ROOT, './test')).filter(p => !p.includes('.'));

  const targetDir = process.argv[2];
  if (targetDir && testDirs.indexOf(targetDir) !== -1) {
    try {
      installMissingDependencies(path.resolve(path.resolve(EXT_ROOT, `./test/${targetDir}/fixture`)));
      await runTests(execPath, `test/${targetDir}`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  } else {
    for (const dir of testDirs) {
      try {
        installMissingDependencies(path.resolve(path.resolve(EXT_ROOT, `./test/${dir}/fixture`)));
        await runTests(execPath, `test/${dir}`);
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
