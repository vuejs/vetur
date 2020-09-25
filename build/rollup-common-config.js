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
  // ignorePartSourcemap
  if (warning.code === 'SOURCEMAP_ERROR') return;
  // prettier 1.x eval
  if (warning.code === 'EVAL' && warning.loc && warning.loc.file.includes('prettier')) return;
  // // This is daily in ESModule
  // if (warning.code === 'CIRCULAR_DEPENDENCY') return;

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

module.exports = {
  getRootURL,
  clearDist,
  onwarn,
  external,
  createPlugins
};
