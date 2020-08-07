import { position, sameLineRange } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should complete frameworks', () => {
  describe('Should complete vue-router tags/attributes', () => {
    const vueRouterUri = getDocUri('completion/VueRouter.vue');

    it('completes vue-router tags', async () => {
      await testCompletion(vueRouterUri, position(3, 5), ['router-link', 'router-view']);
    });

    it('completes vue-router attributes', async () => {
      await testCompletion(vueRouterUri, position(2, 17), ['replace']);
    });
  });

  describe('Should complete element-ui components (devDependency, loaded from bundled JSON)', () => {
    const elementUri = getDocUri('completion/Element.vue');

    it('completes <el-button> and <el-card>', async () => {
      await testCompletion(elementUri, position(2, 5), ['el-button', 'el-card']);
    });

    it('completes attributes for <el-button>', async () => {
      await testCompletion(elementUri, position(1, 14), ['size', 'type', 'plain']);
    });
  });

  describe('Should complete Quasar components (dependency, loaded from node_modules)', () => {
    const quasarUri = getDocUri('completion/Quasar.vue');

    it('completes <q-btn>', async () => {
      await testCompletion(quasarUri, position(2, 5), ['q-btn']);
    });

    it('completes attributes for <q-btn>', async () => {
      await testCompletion(quasarUri, position(1, 10), ['label', 'icon']);
    });
  });

  describe('Should complete tags defined in workspace', () => {
    const workspaceCustomTagsUri = getDocUri('completion/WorkspaceCustomTags.vue');

    it('completes <foo-tag>', async () => {
      await testCompletion(workspaceCustomTagsUri, position(2, 6), ['foo-tag']);
    });

    it('completes attributes for <foo-bar>', async () => {
      await testCompletion(workspaceCustomTagsUri, position(1, 12), ['foo-attr']);
    });
  });
});
