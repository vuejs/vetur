const fs = require('fs-extra');
const path = require('path');
const fg = require('fast-glob');
const { getRootURL, clearDist, external, onwarn, createPlugins } = require('../build/rollup-common-config');
const { linkVlsInCLI, bundleVlsWithEsbuild } = require('../build/rollup-plugins.js');
const vlsPkg = require('./package.json');

const getVlsURL = getRootURL('server');

clearDist(getVlsURL('dist'));

function copySnippets() {
  return {
    name: 'copy-snippets',
    buildEnd() {
      fs.copySync(getVlsURL('src/modes/vue/veturSnippets'), getVlsURL('dist/veturSnippets'), {
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
        cwd: getVlsURL(''),
        unique: true,
        absolute: true
      });
      files.forEach(file => fs.copySync(file, getVlsURL('dist/' + path.basename(file)), { overwrite: true }));
    }
  };
}

module.exports = [
  // vueServerMain
  {
    input: getVlsURL('src/vueServerMain.ts'),
    output: { file: getVlsURL('dist/vueServerMain.js'), name: vlsPkg.name, format: 'cjs', sourcemap: true },
    external,
    onwarn,
    watch: {
      include: getVlsURL('**')
    },
    plugins: [
      bundleVlsWithEsbuild(),
      copySnippets(),
      copyTSDefaultLibs(),
      linkVlsInCLI(),
      ...createPlugins(getVlsURL('tsconfig.json'))
    ]
  }
];
