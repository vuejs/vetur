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

      if (!service) {
        // hack with esbuild and vscode debugger
        const oldCwd = process.cwd;
        process.cwd = () => getServerURL('../');
        service = await startService();
        process.cwd = oldCwd;
      }
      console.log(`bundles ${getServerURL('src/main.ts')} with esbuild`);
      await service.build({
        entryPoints: [getServerURL('src/main.ts')],
        outfile: getServerURL('dist/vls.js'),
        minify: true,
        bundle: true,
        sourcemap: true,
        platform: 'node',
        mainFields: ['module,main'],
        target: 'es2018',
        external: ['vscode', 'eslint-plugin-vue', 'stylus', 'eslint'],
        format: 'cjs',
        tsconfig: getServerURL('tsconfig.json')
      });
      console.log(`✨ success with esbuild`);
    },
    async buildEnd() {
      if (!process.env.ROLLUP_WATCH) {
        service.stop();
      }
    }
  };
}

module.exports = { linkVlsInCLI, bundleVlsWithEsbuild };
