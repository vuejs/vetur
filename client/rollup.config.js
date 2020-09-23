const { getRootURL, clearDist, external, createPlugins } = require('../build/rollup-common-config');
const clientPkg = require('../package.json');

const getClientURL = getRootURL('client');

clearDist(getClientURL('../dist'));
module.exports = {
  input: getClientURL('vueMain.ts'),
  output: { file: clientPkg.main, name: clientPkg.name, format: 'cjs', sourcemap: true },
  external,
  watch: {
    include: getClientURL('**')
  },
  plugins: createPlugins(getClientURL('tsconfig.json'))
};
