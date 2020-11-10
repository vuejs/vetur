const { getRootPath, clearDist, external, createPlugins } = require('../build/rollup-common-config');
const clientPkg = require('../package.json');

const getClientPath = getRootPath('client');

clearDist(getClientPath('../dist'));
module.exports = {
  input: getClientPath('vueMain.ts'),
  output: { file: clientPkg.main, name: clientPkg.name, format: 'cjs', sourcemap: true },
  external,
  watch: {
    include: getClientPath('**')
  },
  plugins: createPlugins(getClientPath('tsconfig.json'))
};
