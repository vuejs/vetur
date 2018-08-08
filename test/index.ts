import * as testRunner from 'vscode/lib/testrunner';

console.log('E2E test start');

testRunner.configure({
  ui: 'bdd',
  useColors: true,
  timeout: 100000
});

module.exports = testRunner;
