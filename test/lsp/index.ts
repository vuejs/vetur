import * as testRunner from '../testRunner';

testRunner.configure({
  ui: 'bdd',
  useColors: true,
  timeout: 100000
});

module.exports = testRunner;
