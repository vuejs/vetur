import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete for <style>', () => {
  describe('Should complete <style> region for all languages', () => {
    const basicUri = getDocUri('completion/style/Basic.vue');
    it('completes CSS properties for <style lang="css">', async () => {
      await testCompletion(basicUri, position(6, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="less">', async () => {
      await testCompletion(basicUri, position(12, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="scss">', async () => {
      await testCompletion(basicUri, position(18, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="stylus">', async () => {
      await testCompletion(basicUri, position(24, 3), ['width', 'word-wrap']);
    });

    it('completes CSS properties for <style lang="postcss">', async () => {
      await testCompletion(basicUri, position(30, 3), ['width', 'word-wrap']);
    });
  });

  describe('Should complete second <style> region', () => {
    const doubleUri = getDocUri('completion/style/Double.vue');

    it('completes CSS properties for second <style lang="scss">', async () => {
      await testCompletion(doubleUri, position(8, 3), ['width', 'word-wrap']);
    });
  });

  describe('Should complete emmet in <style lang="sass"> region', () => {
    const sassEmmetUri = getDocUri('completion/style/SassEmmet.vue');

    it('completes CSS properties for second <style lang="scss">', async () => {
      await testCompletion(sassEmmetUri, position(2, 4), ['left: 0']);
    });
  });
});
