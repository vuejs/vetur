/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, Uri } from 'vscode';
import { join, basename, dirname, resolve } from 'path';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { deepEqual, AssertionError } from 'assert';

async function assertUnchangedTokens(testFixurePath: string, done: (err?: Error) => void) {
  const fileName = basename(testFixurePath);

  try {
    const data = await commands.executeCommand('_workbench.captureSyntaxTokens', Uri.file(testFixurePath));
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
          if (Array.isArray(data) && Array.isArray(previousData)) {
            for (let i = 0; i < data.length; i++) {
              const d = data[i];
              const p = previousData[i];
              if (d.c !== p.c || hasThemeChange(d.r, p.r)) {
                writeFileSync(resultPath, JSON.stringify(data, null, '\t'));
                throw new Error(`Syntax difference in file ${fileName}: ${d.c} does not equal ${p.c}
                  at ${(e as AssertionError).message}`);
              }
            }

            if (data.length !== previousData.length) {
              throw new Error(`Unequal token length at file ${fileName}`);
            }
            // different but no tokenization or color change: no failure
          } else {
            throw new Error(`Syntax not equal at file '${fileName}': ${(e as AssertionError).message}`);
          }
          writeFileSync(resultPath, JSON.stringify(data, null, '\t'));
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
  const extensionColorizeFixturePath = resolve(__dirname, '../../../test/grammar/fixture');
  if (existsSync(extensionColorizeFixturePath)) {
    const fixturesFiles = readdirSync(extensionColorizeFixturePath);
    fixturesFiles.forEach(fixturesFile => {
      // define a test for each fixture
      it('should colorize ' + fixturesFile + ' right', function(done) {
        // tslint:disable-next-line
        assertUnchangedTokens(join(extensionColorizeFixturePath, fixturesFile), done);
      });
    });
  }
});
