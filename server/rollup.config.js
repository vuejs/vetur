import { getRootURL, clearDist, external, onwarn, createPlugins } from '../build/rollup-common-config';
import { linkVlsInCLI, ignorePartSourcemap } from '../build/rollup-plugins.js';
import vlsPkg from './package.json';
import copy from 'rollup-plugin-copy';

const getVlsURL = getRootURL('server');

clearDist(getVlsURL('dist'));
export default [
  // vls
  {
    input: getVlsURL('src/main.ts'),
    output: { file: getVlsURL(vlsPkg.main), name: vlsPkg.name, format: 'cjs', sourcemap: true, interop: 'auto' },
    external,
    onwarn,
    // Close treeshake, because bundle size is same and reduce build time.
    treeshake: false,
    watch: {
      include: getVlsURL('**')
    },
    plugins: [
      ignorePartSourcemap(),
      ...createPlugins(getVlsURL('tsconfig.json')),
      copy({
        targets: [
          // Vetur built-in snippets
          { src: getVlsURL('src/modes/vue/veturSnippets'), dest: getVlsURL('dist/') },
          // TypeScript Default lib files
          { src: getVlsURL('node_modules/typescript/lib/lib*.d.ts'), dest: getVlsURL('dist/') }
        ],
        overwrite: true
      })
    ]
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
