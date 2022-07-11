const fs = require('fs-extra');
const path = require('path');
const fg = require('fast-glob');
const { getRootPath, clearDist, external, onwarn, createPlugins } = require('../build/rollup-common-config');
const {
  linkVlsInCLI,
  bundleVlsWithEsbuild,
  watchVlsChange,
  generateTypingsVls
} = require('../build/rollup-plugins.js');
const vlsPkg = require('./package.json');
const dts = require('rollup-plugin-dts').default;

const getVLSPath = getRootPath('server');

clearDist(getVLSPath('dist'));

function copySnippets() {
  return {
    name: 'copy-snippets',
    buildEnd() {
      fs.copySync(getVLSPath('src/modes/vue/veturSnippets'), getVLSPath('dist/veturSnippets'), {
        overwrite: true,
        recursive: true
      });
    }
  };
}

function copyTSDefaultLibs() {
  return {
    name: 'copy-ts-default-libs',
    buildEnd() {
      const files = fg.sync('node_modules/typescript/lib/lib*.d.ts', {
        cwd: getVLSPath(''),
        unique: true,
        absolute: true
      });
      files.forEach(file => fs.copySync(file, getVLSPath('dist/' + path.basename(file)), { overwrite: true }));
    }
  };
}

module.exports = [
  // vueServerMain
  {
    input: getVLSPath('src/vueServerMain.ts'),
    output: { file: getVLSPath('dist/vueServerMain.js'), name: vlsPkg.name, format: 'cjs', sourcemap: true },
    external,
    onwarn,
    watch: {
      include: getVLSPath('**')
    },
    plugins: [
      watchVlsChange(),
      generateTypingsVls(),
      bundleVlsWithEsbuild(),
      copySnippets(),
      // copyTSDefaultLibs(),
      linkVlsInCLI(),
      ...createPlugins(getVLSPath('tsconfig.json'))
    ]
  },
  // bundle typings
  {
    input: getVLSPath('typings/index.d.ts'),
    output: {
      file: getVLSPath('dist/vls.d.ts'),
      format: 'es'
    },
    onwarn,
    plugins: [dts()]
  }
];
