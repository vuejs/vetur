import * as remote from 'gulp-remote-src-vscode';
import * as vzip from 'gulp-vinyl-zip';
import * as vfs from 'vinyl-fs';
import * as untar from 'gulp-untar';
import * as gunzip from 'gulp-gunzip';
import * as chmod from 'gulp-chmod';
import * as filter from 'gulp-filter';
import * as path from 'path';
import * as request from 'request';
import * as source from 'vinyl-source-stream';
import * as URL from 'url-parse';

const downloadPlatform =
  process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32-archive' : 'linux-x64';

export function downloadVSCode(testRunFolderAbsolute: string): Promise<any> {
  return new Promise((resolve, reject) => {
    getDownloadUrl(downloadUrl => {
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
          .pipe(vfs.dest(testRunFolderAbsolute));
      } else {
        stream = remote('', { base: downloadUrl })
          .pipe(vzip.src())
          .pipe(vfs.dest(testRunFolderAbsolute));
      }

      stream.on('error', (err) => {
        console.error(err);
        reject();
      });
      stream.on('end', resolve);
    });
  });
}

function getDownloadUrl(clb) {
  getTag(function(tag) {
    return clb(['https://vscode-update.azurewebsites.net', tag, downloadPlatform, 'stable'].join('/'));
  });
}

function getTag(clb) {
  getContents('https://vscode-update.azurewebsites.net/api/releases/stable/' + downloadPlatform, null, null, function(
    error,
    tagsRaw
  ) {
    if (error) {
      exitWithError(error);
    }

    try {
      clb(JSON.parse(tagsRaw)[0]); // first one is latest
    } catch (error) {
      exitWithError(error);
    }
  });
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

function exitWithError(error) {
  console.error('Error running tests: ' + error.toString());
  process.exit(1);
}
