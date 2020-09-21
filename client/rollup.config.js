import { getRootURL, clearDist, external, createPlugins } from '../build/rollup-common-config';
import clientPkg from '../package.json';

const getClientURL = getRootURL('client');

clearDist(getClientURL('../dist'));
export default {
  input: getClientURL('vueMain.ts'),
  output: { file: clientPkg.main, name: clientPkg.name, format: 'cjs', sourcemap: true },
  external,
  watch: {
    include: getClientURL('**')
  },
  plugins: createPlugins(getClientURL('tsconfig.json'))
};
