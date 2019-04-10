import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { testCompletion } from './helper';
import { position, getDocUri } from '../util';

describe('Should autocomplete for <style>', () => {
  const docUri = getDocUri('client/completion/style/Basic.vue');
  const doubleDocUri = getDocUri('client/completion/style/Double.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await showFile(doubleDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  describe('Should complete <style> section for all languages', () => {
    it('completes CSS properties for <style lang="css">', async () => {
      await testCompletion(docUri, position(6, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="less">', async () => {
      await testCompletion(docUri, position(12, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="scss">', async () => {
      await testCompletion(docUri, position(18, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="stylus">', async () => {
      await testCompletion(docUri, position(24, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="postcss">', async () => {
      await testCompletion(docUri, position(30, 3), ['width', 'word-wrap']);
    });
  });

  describe('Should complete second <style> section', () => {
    it('completes CSS properties for second <style lang="scss">', async () => {
      await testCompletion(doubleDocUri, position(8, 3), ['width', 'word-wrap']);
    });
  });
});
