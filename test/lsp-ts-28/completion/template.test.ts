import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, getDocUri } from '../util';
import { testCompletion } from './helper';

describe('Should autocomplete for <template>', () => {
  const templateDocUri = getDocUri('client/completion/template/Basic.vue');
  const templateFrameworkDocUri = getDocUri('client/completion/template/Framework.vue');
  const templateQuasarDocUri = getDocUri('client/completion/template/Quasar.vue');

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
});
