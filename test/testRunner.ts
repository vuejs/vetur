/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as paths from 'path';
import * as glob from 'glob';

// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement the method statically
const tty = require('tty');
if (!tty.getWindowSize) {
  tty.getWindowSize = function() {
    return [80, 75];
  };
}

import Mocha = require('mocha');

let mocha = new Mocha(<any>{
  ui: 'tdd',
  useColors: true
});

export function configure(opts: MochaSetupOptions): void {
  mocha = new Mocha(opts);
}

export function run(testsRoot: string, clb: (err: Error | null, failures?: number) => void): void {
  // Enable source map support
  require('source-map-support').install();

  // Glob test files
  glob('**/**.test.js', { cwd: testsRoot }, (error, files) => {
    if (error) {
      return clb(error);
    }

    try {
      // Fill into Mocha
      files.forEach(f => mocha.addFile(paths.join(testsRoot, f)));

      // Run the tests
      mocha.run(failures => {
        clb(null, failures);
      });
    } catch (error) {
      return clb(error);
    }
  });
}
