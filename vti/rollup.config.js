import { getRootURL, clearDist, external, onwarn, createPlugins } from '../build/rollup-common-config';
import vtiPkg from './package.json';

const getVtiURL = getRootURL('vti');

clearDist(getVtiURL('dist'));
export default {
  input: getVtiURL('src/cli.ts'),
  output: { file: getVtiURL(vtiPkg.main), name: vtiPkg.name, format: 'cjs', sourcemap: true },
  external: [...external, 'vls'],
  onwarn,
  watch: {
    include: getVtiURL('**')
  },
  plugins: createPlugins(getVtiURL('tsconfig.json'))
};
