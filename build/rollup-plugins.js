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

function typeCheckVls() {
  return {
    name: 'type-check-vls',
    async buildStart() {
      return new Promise((resolve, reject) => {
        const tsc = spawn(getServerURL('node_modules/.bin/tsc'), ['--noEmit', '--pretty'], { cwd: getServerURL('./') });
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

module.exports = { linkVlsInCLI, bundleVlsWithEsbuild, typeCheckVls, watchVlsChange };
