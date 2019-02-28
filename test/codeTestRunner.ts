#!/usr/bin/env node

import * as remote from 'gulp-remote-src-vscode';
import * as vzip from 'gulp-vinyl-zip';
import * as vfs from 'vinyl-fs';
import * as untar from 'gulp-untar';
import * as gunzip from 'gulp-gunzip';
import * as chmod from 'gulp-chmod';
import * as filter from 'gulp-filter';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as request from 'request';
import * as source from 'vinyl-source-stream';
import * as URL from 'url-parse';
import * as $ from 'shelljs';

const version = process.env.CODE_VERSION || '*';
const isInsiders = version === 'insiders';

const testRunFolder = path.join('.vscode-test', isInsiders ? 'insiders' : 'stable');
const testRunFolderAbsolute = path.join(process.cwd(), testRunFolder);

const downloadPlatform =
  process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32-archive' : 'linux-x64';

let windowsExecutable;
let darwinExecutable;
let linuxExecutable;

if (isInsiders) {
  windowsExecutable = path.join(testRunFolderAbsolute, 'Code - Insiders.exe');
  darwinExecutable = path.join(
    testRunFolderAbsolute,
    'Visual Studio Code - Insiders.app',
    'Contents',
    'MacOS',
    'Electron'
  );
  linuxExecutable = path.join(testRunFolderAbsolute, 'VSCode-linux-x64', 'code-insiders');
} else {
  windowsExecutable = path.join(testRunFolderAbsolute, 'Code.exe');
  darwinExecutable = path.join(testRunFolderAbsolute, 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron');
  linuxExecutable = path.join(testRunFolderAbsolute, 'VSCode-linux-x64', 'code');
  if (
    ['0.10.1', '0.10.2', '0.10.3', '0.10.4', '0.10.5', '0.10.6', '0.10.7', '0.10.8', '0.10.9'].indexOf(version) >= 0
  ) {
    linuxExecutable = path.join(testRunFolderAbsolute, 'VSCode-linux-x64', 'Code');
  }
}

const executable =
  process.platform === 'darwin' ? darwinExecutable : process.platform === 'win32' ? windowsExecutable : linuxExecutable;

console.log('### Vetur Integration Test ###');
console.log('');

const EXT_ROOT = path.resolve(__dirname, '../../');

function runTests(testWorkspaceRelativePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const testWorkspace = path.resolve(EXT_ROOT, testWorkspaceRelativePath, 'fixture');
    const extTestPath = path.resolve(EXT_ROOT, 'dist', testWorkspaceRelativePath);

    const args = [
      testWorkspace,
      '--extensionDevelopmentPath=' + EXT_ROOT,
      '--extensionTestsPath=' + extTestPath,
      '--locale=en'
    ];

    if (process.env.CODE_DISABLE_EXTENSIONS) {
      args.push('--disable-extensions');
    }

    console.log(`Test folder: ${path.join('dist', testWorkspaceRelativePath)}`);
    console.log(`Workspace:   ${testWorkspaceRelativePath}`);

    const cmd = cp.spawn(executable, args);

    cmd.stdout.on('data', function(data) {
      const s = data.toString();
      if (!s.includes('update#setState idle')) {
        console.log(s);
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

async function runAllTests() {
  const testDirs = fs.readdirSync(path.resolve(EXT_ROOT, './test')).filter(p => !p.includes('.'));

  for (const dir of testDirs) {
    try {
      installMissingDependencies(path.resolve(path.resolve(EXT_ROOT, `./test/${dir}/fixture`)));
      await runTests(`test/${dir}`);
    } catch (err) {
      exitWithError(err);
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

function downloadExecutableAndRunTests() {
  getDownloadUrl(function(downloadUrl) {
    console.log('Downloading VS Code into "' + testRunFolderAbsolute + '" from: ' + downloadUrl);

    const version = downloadUrl.match(/\d+\.\d+\.\d+/)[0].split('.');
    const isTarGz = downloadUrl.match(/linux/) && version[0] >= 1 && version[1] >= 5;

    let stream;
    if (isTarGz) {
      const gulpFilter = filter(
        [
          'VSCode-linux-x64/code',
          'VSCode-linux-x64/code-insiders',
          'VSCode-linux-x64/resources/app/node_modules*/vscode-ripgrep/**/rg'
        ],
        { restore: true }
      );
      stream = request(toRequestOptions(downloadUrl))
        .pipe(source(path.basename(downloadUrl)))
        .pipe(gunzip())
        .pipe(untar())
        .pipe(gulpFilter)
        .pipe(chmod(493)) // 0o755
        .pipe(gulpFilter.restore)
        .pipe(vfs.dest(testRunFolder));
    } else {
      stream = remote('', { base: downloadUrl })
        .pipe(vzip.src())
        .pipe(vfs.dest(testRunFolder));
    }

    stream.on('end', runAllTests);
  });
}

function getDownloadUrl(clb) {
  if (process.env.CODE_DOWNLOAD_URL) {
    return clb(process.env.CODE_DOWNLOAD_URL);
  }

  getTag(function(tag) {
    return clb(
      ['https://vscode-update.azurewebsites.net', tag, downloadPlatform, isInsiders ? 'insider' : 'stable'].join('/')
    );
  });
}

function getTag(clb) {
  if (version !== '*' && version !== 'insiders') {
    return clb(version);
  }

  getContents(
    'https://vscode-update.azurewebsites.net/api/releases/' + (isInsiders ? 'insider/' : 'stable/') + downloadPlatform,
    null,
    null,
    function(error, tagsRaw) {
      if (error) {
        exitWithError(error);
      }

      try {
        clb(JSON.parse(tagsRaw)[0]); // first one is latest
      } catch (error) {
        exitWithError(error);
      }
    }
  );
}

fs.exists(executable, async exists => {
  if (exists) {
    runAllTests();
  } else {
    downloadExecutableAndRunTests();
  }
});

function exitWithError(error) {
  console.error('Error running tests: ' + error.toString());
  process.exit(1);
}

export function getContents(url, token, headers, callback) {
  request.get(toRequestOptions(url, token, headers), function(error, response, body) {
    if (!error && response && response.statusCode >= 400) {
      error = new Error('Request returned status code: ' + response.statusCode + '\nDetails: ' + response.body);
    }

    callback(error, body);
  });
}

export function toRequestOptions(url, token?, headers?) {
  headers = headers || {
    'user-agent': 'nodejs'
  };

  if (token) {
    headers['Authorization'] = 'token ' + token;
  }

  const parsedUrl = new URL(url);

  const options: any = {
    url,
    headers
  };

  // We need to test the absence of true here because there is an npm bug that will not set boolean
  // env variables if they are set to false.
  if (process.env.npm_config_strict_ssl !== 'true') {
    options.strictSSL = false;
  }

  if (process.env.npm_config_proxy && parsedUrl.protocol === 'http:') {
    options.proxy = process.env.npm_config_proxy;
  } else if (process.env.npm_config_https_proxy && parsedUrl.protocol === 'https:') {
    options.proxy = process.env.npm_config_https_proxy;
  }

  return options;
}
