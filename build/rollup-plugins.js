const { startService } = require('esbuild');
const path = require('path');

function linkVlsInCLI() {
  return {
    name: 'link-vls-in-cli',
    resolveId(source, importer) {
      if (source === './services/vls') {
        return { id: './vls.js', external: true };
      }
      return null;
    }
  };
}

function bundleVlsWithEsbuild() {
  /**
   * @type {import('esbuild').Service | null}
   */
  let service = null;
  const getServerURL = url => path.resolve(__dirname, '../server', url);

  return {
    name: 'bundle-vls-with-esbuild',
    async buildStart() {
      // watch src changed
      this.addWatchFile(getServerURL('src/'));

      if (!service) service = await startService();
      console.log(`bundles ${getServerURL('src/main.ts')} with esbuild`);
      await service.build({
        entryPoints: [getServerURL('src/main.ts')],
        outfile: getServerURL('dist/vls.js'),
        minify: true,
        bundle: true,
        sourcemap: true,
        platform: 'node',
        // Pending https://github.com/evanw/esbuild/issues/440 release
        // mainFields: ['module,main'],
        target: 'es2018',
        external: ['vscode', 'eslint-plugin-vue', 'stylus', 'eslint'],
        format: 'cjs',
        tsconfig: getServerURL('tsconfig.json')
      });
      console.log(`✨ success with esbuild`);
    }
  };
}

module.exports = { linkVlsInCLI, bundleVlsWithEsbuild };
