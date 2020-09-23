import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { getRootURL, clearDist, external, onwarn, createPlugins } from '../build/rollup-common-config';
import { linkVlsInCLI, ignorePartSourcemap } from '../build/rollup-plugins.js';
import vlsPkg from './package.json';

const getVlsURL = getRootURL('server');

clearDist(getVlsURL('dist'));

function copySnippets() {
  return {
    name: 'copy-snippets',
    buildEnd() {
      fs.copySync(
        path.resolve(__dirname, '../', getVlsURL('src/modes/vue/veturSnippets')),
        path.resolve(__dirname, '../', getVlsURL('dist/veturSnippets')),
        { overwrite: true }
      );
    }
  };
}

function copyTSDefaultLibs() {
  return {
    name: 'copy-ts-default-libs',
    buildEnd() {
      const files = fg.sync(getVlsURL('node_modules/typescript/lib/lib*.d.ts'), { unique: true, absolute: true });
      files.forEach(file =>
        fs.copySync(file, path.resolve(__dirname, '../', getVlsURL('dist/'), path.basename(file)), { overwrite: true })
      );
    }
  };
}

export default [
  // vls
  {
    input: getVlsURL('src/main.ts'),
    output: { file: getVlsURL(vlsPkg.main), name: vlsPkg.name, format: 'cjs', sourcemap: true, interop: 'auto' },
    external,
    onwarn,
    watch: {
      include: getVlsURL('**')
    },
    plugins: [ignorePartSourcemap(), ...createPlugins(getVlsURL('tsconfig.json')), copySnippets(), copyTSDefaultLibs()]
  },
  // vueServerMain
  {
    input: getVlsURL('src/vueServerMain.ts'),
    output: { file: getVlsURL('dist/vueServerMain.js'), name: vlsPkg.name, format: 'cjs', sourcemap: true },
    external,
    onwarn,
    watch: {
      include: getVlsURL('**')
    },
    plugins: [linkVlsInCLI(), ignorePartSourcemap(), ...createPlugins(getVlsURL('tsconfig.json'))]
  }
];
