const path = require('path');
const fs = require('fs');
const json = require('@rollup/plugin-json');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const resolve = require('@rollup/plugin-node-resolve').default;
const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');

const production = process.env.MINIFY === 'false' ? false : !process.env.ROLLUP_WATCH;

const getRootURL = root => relative => path.resolve(__dirname, '../', root, relative);

const clearDist = dist => {
  if (fs.existsSync(dist)) {
    fs.rmdirSync(dist, { recursive: true });
  }
};

const onwarn = (warning, warn) => {
  // typescript tslib
  if (warning.code === 'THIS_IS_UNDEFINED') return;

  warn(warning);
};

const external = [
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
  'stylus',
  '@prettier/plugin-pug'
];

const createPlugins = tsconfig => [
  json(),
  resolve(),
  commonjs(),
  typescript({ tsconfig, tsconfigOverride: { compilerOptions: { module: 'esnext' } } }),
  production && terser()
];

module.exports = {
  getRootURL,
  clearDist,
  onwarn,
  external,
  createPlugins
};
