const { getRootURL, clearDist, external, onwarn, createPlugins } = require('../build/rollup-common-config');
const vtiPkg = require('./package.json');

const getVtiURL = getRootURL('vti');

clearDist(getVtiURL('dist'));
module.exports = {
  input: getVtiURL('src/cli.ts'),
  output: { file: getVtiURL(vtiPkg.main), name: vtiPkg.name, format: 'cjs', sourcemap: true },
  external: [...external, 'vls'],
  onwarn,
  watch: {
    include: getVtiURL('**')
  },
  plugins: createPlugins(getVtiURL('tsconfig.json'))
};
