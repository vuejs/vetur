import { position } from '../../../util';
import { testCompletion, testNoSuchCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete scaffold snippets', () => {
  const vueDocUri = getDocUri('completion/vue/Scaffold.vue');
  const vueCustomDocUri = getDocUri('completion/vue/Custom.vue');

  it('completes all scaffold snippets', async () => {
    await testCompletion(vueDocUri, position(0, 1), [
      '<vue> with default.vue ✌',
      '<template> html.vue ✌',
      '<template> pug.vue ✌',
      '<style> css-scoped.vue ✌',
      '<style> css.vue ✌',
      '<style> less-scoped.vue ✌',
      '<style> less.vue ✌',
      '<style> postcss-scoped.vue ✌',
      '<style> postcss.vue ✌',
      '<style> sass-scoped.vue ✌',
      '<style> sass.vue ✌',
      '<style> scss-scoped.vue ✌',
      '<style> scss.vue ✌',
      '<style> sss-scoped.vue ✌',
      '<style> sss.vue ✌',
      '<style> stylus-scoped.vue ✌',
      '<style> stylus.vue ✌',
      '<script> javascript.vue ✌',
      '<script> typescript.vue ✌'
    ]);
  });

  it('completes project wide scaffold snippets', async () => {
    await testCompletion(vueDocUri, position(0, 1), [
      {
        label: '<vue> with foo.vue 💼'
      }
    ]);
  });

  it('No completes snippets in custom block', async () => {
    await testNoSuchCompletion(vueCustomDocUri, position(15, 1), ['<vue> with default.vue ✌']);
  });
});
