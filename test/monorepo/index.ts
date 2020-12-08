import path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export function run(): Promise<void> {
  const args = {};

  Object.keys(process.env)
    .filter(k => k.startsWith('MOCHA_'))
    .forEach(k => {
      args[k.slice('MOCHA_'.length)] = process.env[k];
    });

  const mocha = new Mocha({
    ui: 'bdd',
    timeout: 100000,
    color: true,
    ...args
  });

  const testsRoot = __dirname;

  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err);
      }

      // Add files to the test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        e(err);
      }
    });
  });
}
