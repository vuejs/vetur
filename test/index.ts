import * as testRunner from 'vscode/lib/testrunner';

testRunner.configure({
  ui: 'bdd',
  useColors: true,
  timeout: 100000,
  grep: 'interpolation'
});

module.exports = testRunner;
