import { CompletionTestSetup, testDSL } from '../../../test-util/completion-test-util';

import { provideCompletionItems } from '../completion-item';

const setup: CompletionTestSetup = {
  langId: 'stylus',
  docUri: 'test://test/test.styl',
  doComplete(doc, pos) {
    return provideCompletionItems(doc, pos);
  }
};

const stylus = testDSL(setup);

suite('Stylus Completion', () => {
  test('basic property', () => {
    stylus`back|`.has('background');

    stylus`.back|`.hasNo('background');

    stylus`
    .background
      back|`.has('background');
  });

  test('variable', () => {
    stylus`
    test-var = red
    .test-selector
      color te|`.has('test-var');

    stylus`
    .test-selector
      test-var = red
      color test-var
    .another-var
      hehe te|`.hasNo('test-var');

    stylus`
    test-var = red
    .test-selector
      te|`.hasNo('test-var');

    stylus`
    test-func(n)
      background n
    .test-selector
      te|`.has('test-func');
  });
});
