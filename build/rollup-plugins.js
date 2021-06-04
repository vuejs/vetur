const { build } = require('esbuild');
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

const getServerPath = url => path.resolve(__dirname, '../server', url);

function watchVlsChange() {
  return {
    buildStart() {
      // watch src changed
      this.addWatchFile(getServerPath('src/'));
    }
  };
}

function generateTypingsVls() {
  return {
    name: 'generate-typings-vls',
    buildStart() {
      return new Promise((resolve, reject) => {
        const tsc = spawn(
          path.join('node_modules', '.bin', 'tsc'),
          [
            '-p',
            'tsconfig.json',
            '--declaration',
            '--declarationDir',
            './typings',
            '--emitDeclarationOnly',
            '--pretty',
            '--incremental'
          ],
          { cwd: getServerPath('./'), shell: true }
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
  const options = {
    entryPoints: [getServerPath('src/main.ts')],
    outfile: getServerPath('dist/vls.js'),
    /**
     * No minify when watch
     * reason: https://github.com/microsoft/vscode/issues/12066
     */
    minify: !process.env.ROLLUP_WATCH,
    keepNames: true,
    bundle: true,
    sourcemap: true,
    platform: 'node',
    // UMD module isn't support in esbuild.
    mainFields: ['module', 'main'],
    // vscode 1.47.0 node version
    target: ['node12.8.1'],
    define: {
      /**
       * `process.env.STYLUS_COV ? require('./lib-cov/stylus') : require('./lib/stylus');`
       */
      'process.env.STYLUS_COV': 'false'
    },
    external: [
      /**
       * The `require.resolve` function is used in eslint config.
       */
      'eslint-plugin-vue',
      /**
       * The VLS is crash when bundle it.
       */
      'eslint',
      /**
       * prettier-eslint and prettier-tslint need it.
       */
      'prettier',
      /**
       * prettier-tslint need it.
       */
      'tslint',
      /**
       * tslint need it.
       */
      'typescript'
    ],
    format: 'cjs',
    tsconfig: getServerPath('tsconfig.json'),
    color: true,
    incremental: !!process.env.ROLLUP_WATCH
  };

  return {
    name: 'bundle-vls-with-esbuild',
    async buildStart() {
      console.log(`bundles ${getServerPath('src/main.ts')} with esbuild`);
      build(options);
      console.log(`✨ success with esbuild`);
    }
  };
}

module.exports = { linkVlsInCLI, bundleVlsWithEsbuild, generateTypingsVls, watchVlsChange };
