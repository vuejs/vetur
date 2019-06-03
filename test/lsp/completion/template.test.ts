import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, getDocUri } from '../util';
import { testCompletion } from './helper';

describe('Should autocomplete for <template>', () => {
  const templateDocUri = getDocUri('client/completion/template/Basic.vue');
  const templateFrameworkDocUri = getDocUri('client/completion/template/Framework.vue');
  const templateQuasarDocUri = getDocUri('client/completion/template/Quasar.vue');
  const templateVuetifyDocUri = getDocUri('client/completion/template/Vuetify.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(templateDocUri);
    await showFile(templateFrameworkDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  describe('Should complete <template> section', () => {
    it('completes directives such as v-if', async () => {
      await testCompletion(templateDocUri, position(1, 8), ['v-if', 'v-cloak']);
    });

    it('completes html tags', async () => {
      await testCompletion(templateDocUri, position(2, 6), ['img', 'iframe']);
    });

    it('completes imported components', async () => {
      await testCompletion(templateDocUri, position(2, 6), ['item']);
    });

    it('completes event modifiers when attribute startsWith @', async () => {
      await testCompletion(templateDocUri, position(3, 17), ['stop', 'prevent', 'capture']);
    });

    it('completes event modifiers when attribute startsWith v-on', async () => {
      await testCompletion(templateDocUri, position(4, 21), ['stop', 'prevent', 'capture']);
    });

    it('completes key modifiers when keyEvent', async () => {
      await testCompletion(templateDocUri, position(5, 21), ['enter', 'space', 'right']);
    });

    it('completes system modifiers when keyEvent', async () => {
      await testCompletion(templateDocUri, position(6, 26), ['ctrl', 'shift', 'exact']);
    });

    it('completes mouse modifiers when MouseEvent', async () => {
      await testCompletion(templateDocUri, position(7, 19), ['left', 'right', 'middle']);
    });

    it('completes system modifiers when MouseEvent', async () => {
      await testCompletion(templateDocUri, position(8, 25), ['ctrl', 'shift', 'exact']);
    });

    it('completes prop modifiers when attribute startsWith :', async () => {
      await testCompletion(templateDocUri, position(9, 17), ['sync']);
    });

    it('completes prop modifiers when attribute startsWith v-bind', async () => {
      await testCompletion(templateDocUri, position(10, 23), ['sync']);
    });

    it('completes vModel modifiers when attribute startsWith v-model', async () => {
      await testCompletion(templateDocUri, position(11, 19), ['lazy', 'number', 'trim']);
    });

    it('completes modifiers when have attribute value', async () => {
      await testCompletion(templateDocUri, position(12, 19), ['stop', 'prevent', 'capture']);
    });
  });

  describe('Should complete element-ui components', () => {
    it('completes <el-button> and <el-card>', async () => {
      await testCompletion(templateFrameworkDocUri, position(2, 5), ['el-button', 'el-card']);
    });

    it('completes attributes for <el-button>', async () => {
      await testCompletion(templateFrameworkDocUri, position(1, 14), ['size', 'type', 'plain']);
    });
  });

  describe('Should complete Quasar components', () => {
    it('completes <q-btn>', async () => {
      await testCompletion(templateQuasarDocUri, position(2, 5), ['q-btn']);
    });

    it('completes attributes for <q-btn>', async () => {
      await testCompletion(templateQuasarDocUri, position(1, 10), ['label', 'icon']);
    });
  });

  describe('Should complete Vuetify components', () => {
    it('completes <v-btn>', async () => {
      await testCompletion(templateVuetifyDocUri, position(2, 5), ['v-btn']);
    });

    it('completes attributes for <v-btn>', async () => {
      await testCompletion(templateVuetifyDocUri, position(1, 10), ['color', 'fab']);
    });
  });
});
