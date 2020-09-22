import path from 'path';
import fs from 'fs';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

export const production = process.env.MINIFY === 'false' ? false : !process.env.ROLLUP_WATCH;

export const getRootURL = root => relative => path.join(root, relative);

export const clearDist = dist => {
  if (fs.existsSync(dist)) {
    fs.rmdirSync(dist, { recursive: true });
  }
};

export const onwarn = (warning, warn) => {
  // typescript tslib
  if (warning.code === 'THIS_IS_UNDEFINED') return;
  // ignorePartSourcemap
  if (warning.code === 'SOURCEMAP_ERROR') return;
  // prettier 1.x eval
  if (warning.code === 'EVAL' && warning.loc && warning.loc.file.includes('prettier')) return;
  // This is daily in ESModule
  if (warning.code === 'CIRCULAR_DEPENDENCY') return;

  warn(warning);
  // console.log(warning)
};

export const external = [
  // node built-in
  'path',
  'fs',
  'child_process',
  'os',
  'net',
  'util',
  'crypto',
  'url',
  'assert',
  'inspector',
  'module',
  'events',
  'tty',
  'buffer',
  'stream',
  'string_decoder',
  'perf_hooks',
  // vscode
  'vscode',
  // eslint config extends use fs path.
  'eslint-plugin-vue',
  // rollup can't handle dependency correctly.
  'stylus'
];

export const createPlugins = tsconfig => [
  json(),
  resolve({ dedupe: ['typescript', 'debug'], preferBuiltins: true }),
  commonjs({
    esmExternals: ['esquery'],
    requireReturnsDefault: 'auto',
    ignoreGlobal: true,
    ignore: [
      // prettier-tslint#yargs#os-locale#execa#cross-spawn@5.1.0
      'spawn-sync',
      // @starptech/prettyhtml#prettier@1.19.1
      // https://github.com/prettier/prettier/issues/6903
      '@microsoft/typescript-etw'
    ]
  }),
  replace({
    // prettier hack
    // https://github.com/prettier/prettier/blob/1e4849fc86d8a998b5512fbaf1b5ceff4bb4550d/src/common/resolve.js#L6
    'commonjsHelpers.commonjsRequire': 'require',
    // prettier 2.x -> flow-parser
    // https://github.com/prettier/prettier/blob/1e4849fc86d8a998b5512fbaf1b5ceff4bb4550d/scripts/build/config.js#L33
    '(new Function("return this")())': '(global)',
    // prettier 1.x -> flow-parser
    '(function(){return this}())': '(global)',
    // Dynamics require avoid @rollup/plugin-commonjs
    "eval('require')": 'require',
    delimiters: ['', '']
  }),
  typescript({ tsconfig, tsconfigOverride: { compilerOptions: { module: 'esnext' } } }),
  production && terser()
];
