/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, Uri } from 'vscode';
import { join, basename, dirname, resolve } from 'path';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { deepEqual } from 'assert';

async function assertUnchangedTokens(testFixurePath: string, done: (err?: Error) => void) {
  const fileName = basename(testFixurePath);

  const basePath = resolve('.');

  try {
    const data = await commands.executeCommand(
      '_workbench.captureSyntaxTokens',
      Uri.file(basePath + '/' + testFixurePath)
    );
    try {
      const resultsFolderPath = join(dirname(dirname(testFixurePath)), 'results');
      if (!existsSync(resultsFolderPath)) {
        mkdirSync(resultsFolderPath);
      }
      const resultPath = join(resultsFolderPath, fileName.replace('.', '_') + '.json');
      if (existsSync(resultPath)) {
        const previousData = JSON.parse(readFileSync(resultPath).toString());
        try {
          deepEqual(data, previousData);
        } catch (e) {
          writeFileSync(resultPath, JSON.stringify(data, null, '\t'), { flag: 'w' });
          if (Array.isArray(data) && Array.isArray(previousData) && data.length === previousData.length) {
            for (let i = 0; i < data.length; i++) {
              const d = data[i];
              const p = previousData[i];
              if (d.c !== p.c || hasThemeChange(d.r, p.r)) {
                throw e;
              }
            }
            // different but no tokenization ot color change: no failure
          } else {
            throw e;
          }
        }
      } else {
        writeFileSync(resultPath, JSON.stringify(data, null, '\t'));
      }
      done();
    } catch (e) {
      done(e);
    }
  } catch (e) {
    return done(e);
  }
}

function hasThemeChange(d: { [x: string]: any }, p: { [x: string]: any }) {
  const keys = Object.keys(d);
  for (const key of keys) {
    if (d[key] !== p[key]) {
      return true;
    }
  }
  return false;
}

describe('colorization', () => {
  const extensionColorizeFixturePath = resolve(__dirname, '../../test/grammar/fixtures');
  if (existsSync(extensionColorizeFixturePath)) {
    const fixturesFiles = readdirSync(extensionColorizeFixturePath);
    fixturesFiles.forEach(fixturesFile => {
      // define a test for each fixture
      it('should colorize ' + fixturesFile + ' right', function(done) {
        assertUnchangedTokens(join(extensionColorizeFixturePath, fixturesFile), done);
      });
    });
  }
});
