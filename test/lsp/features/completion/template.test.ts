import { ConfigurationTarget, workspace } from 'vscode';
import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete for <template>', () => {
  describe('Should complete <template> section', () => {
    const basicUri = getDocUri('completion/template/Basic.vue');

    it('completes directives such as v-if', async () => {
      await testCompletion(basicUri, position(1, 8), ['v-if', 'v-cloak']);
    });

    it('completes html tags', async () => {
      await testCompletion(basicUri, position(2, 6), ['img', 'iframe']);
    });

    it('completes imported components', async () => {
      await testCompletion(basicUri, position(2, 6), ['item']);
    });

    it('completes event modifiers when attribute startsWith @', async () => {
      await testCompletion(basicUri, position(3, 17), ['stop', 'prevent', 'capture']);
    });

    it('completes event modifiers when attribute startsWith v-on', async () => {
      await testCompletion(basicUri, position(4, 21), ['stop', 'prevent', 'capture']);
    });

    it('completes key modifiers when keyEvent', async () => {
      await testCompletion(basicUri, position(5, 21), ['enter', 'space', 'right']);
    });

    it('completes system modifiers when keyEvent', async () => {
      await testCompletion(basicUri, position(6, 26), ['ctrl', 'shift', 'exact']);
    });

    it('completes mouse modifiers when MouseEvent', async () => {
      await testCompletion(basicUri, position(7, 19), ['left', 'right', 'middle']);
    });

    it('completes system modifiers when MouseEvent', async () => {
      await testCompletion(basicUri, position(8, 25), ['ctrl', 'shift', 'exact']);
    });

    it('completes prop modifiers when attribute startsWith :', async () => {
      await testCompletion(basicUri, position(9, 17), ['sync']);
    });

    it('completes prop modifiers when attribute startsWith v-bind', async () => {
      await testCompletion(basicUri, position(10, 23), ['sync']);
    });

    it('completes vModel modifiers when attribute startsWith v-model', async () => {
      await testCompletion(basicUri, position(11, 19), ['lazy', 'number', 'trim']);
    });

    it('completes modifiers when have attribute value', async () => {
      await testCompletion(basicUri, position(12, 19), ['stop', 'prevent', 'capture']);
    });
  });

  describe('Should complete element-ui components', () => {
    const elementUri = getDocUri('completion/template/Element.vue');

    it('completes <el-button> and <el-card>', async () => {
      await testCompletion(elementUri, position(2, 5), ['el-button', 'el-card']);
    });

    it('completes attributes for <el-button>', async () => {
      await testCompletion(elementUri, position(1, 14), ['size', 'type', 'plain']);
    });
  });

  describe('Should complete Quasar components', () => {
    const quasarUri = getDocUri('completion/template/Quasar.vue');

    it('completes <q-btn>', async () => {
      await testCompletion(quasarUri, position(2, 5), ['q-btn']);
    });

    it('completes attributes for <q-btn>', async () => {
      await testCompletion(quasarUri, position(1, 10), ['label', 'icon']);
    });
  });

  describe('Should complete Vuetify components', () => {
    const vuetifyUri = getDocUri('completion/template/Vuetify.vue');

    it('completes <v-btn>', async () => {
      await testCompletion(vuetifyUri, position(2, 5), ['v-btn']);
    });

    it('completes attributes for <v-btn>', async () => {
      await testCompletion(vuetifyUri, position(1, 10), ['color', 'fab']);
    });
  });

  describe('Should complete tags defined in workspace', () => {
    const workspaceCustomTagsUri = getDocUri('completion/template/WorkspaceCustomTags.vue');

    it('completes <foo-tag>', async () => {
      await testCompletion(workspaceCustomTagsUri, position(2, 6), ['foo-tag']);
    });

    it('completes attributes for <foo-bar>', async () => {
      await testCompletion(workspaceCustomTagsUri, position(1, 12), ['foo-attr']);
    });
  });

  describe('Parent - Child component completion', () => {
    const parentUri = getDocUri('completion/template/childComponent/Parent.vue');

    it('completes tags/attributes for ChildComp', async () => {
      const c = workspace.getConfiguration();

      // test this in "vetur.completion.tagCasing": "initial"
      await c.update('vetur.completion.tagCasing', 'initial', ConfigurationTarget.Global);

      await testCompletion(parentUri, position(4, 6), ['ChildComp']);

      await testCompletion(parentUri, position(2, 15), ['attr-a']);
      await testCompletion(parentUri, position(3, 16), ['attr-a']);

      // set it back
      await c.update('vetur.completion.tagCasing', undefined, ConfigurationTarget.Global);
    });

    const parent1775Uri = getDocUri('completion/template/childComponent/Parent1775.vue');
    it('AAA completes child when child `export default {}` ends with `;`', async () => {
      await testCompletion(parent1775Uri, position(1, 13), ['attr']);
    });
  });
});
