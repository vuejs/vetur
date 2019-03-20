import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { testCompletion } from './helper';
import { position, getDocUri } from '../util';

describe('Should autocomplete for <style>', () => {
  const templateDocUri = getDocUri('client/completion/style/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(templateDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  describe('Should complete <style> section for all languages', () => {
    it('completes CSS properties for <style lang="css">', async () => {
      await testCompletion(templateDocUri, position(6, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="less">', async () => {
      await testCompletion(templateDocUri, position(12, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="scss">', async () => {
      await testCompletion(templateDocUri, position(18, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="stylus">', async () => {
      await testCompletion(templateDocUri, position(24, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="postcss">', async () => {
      await testCompletion(templateDocUri, position(30, 3), ['width', 'word-wrap']);
    });
  });
});
