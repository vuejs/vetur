const { startService } = require('esbuild');
const path = require('path');
const { spawn } = require('child_process');

function linkVlsInCLI() {
  return {
    name: 'link-vls-in-cli',
    resolveId(source) {
      if (source === './services/vls') {
        return { id: './vls.js', external: true };
      }
      return null;
    }
  };
}

const getServerURL = url => path.resolve(__dirname, '../server', url);

function watchVlsChange() {
  return {
    buildStart() {
      // watch src changed
      this.addWatchFile(getServerURL('src/'));
    }
  };
}

function generateTypingsVls() {
  return {
    name: 'generate-typings-vls',
    buildStart() {
      return new Promise((resolve, reject) => {
        const tsc = spawn(
          getServerURL('node_modules/.bin/tsc'),
          ['--declaration', '--declarationDir', './dist/types', '--emitDeclarationOnly', '--pretty'],
          { cwd: getServerURL('./'), shell: true }
        );
        tsc.stdout.on('data', data => {
          process.stdout.write(data);
        });
        tsc.stderr.on('data', data => {
          process.stderr.write(data);
        });

        tsc.on('close', code => {
          if (code !== 0) {
            reject('type-check error.');
            return;
          }
          resolve();
        });
      });
    }
  };
}

function bundleVlsWithEsbuild() {
  /**
   * @type {import('esbuild').Service | null}
   */
  let service = null;

  return {
    name: 'bundle-vls-with-esbuild',
    async buildStart() {
      if (!service) {
        service = await startService();
      }
      console.log(`bundles ${getServerURL('src/main.ts')} with esbuild`);
      await service.build({
        entryPoints: [getServerURL('src/main.ts')],
        outfile: getServerURL('dist/vls.js'),
        // No minify when watch
        // reason: https://github.com/microsoft/vscode/issues/12066
        minify: !process.env.ROLLUP_WATCH,
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

module.exports = { linkVlsInCLI, bundleVlsWithEsbuild, generateTypingsVls, watchVlsChange };
