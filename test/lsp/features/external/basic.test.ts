import { testCompletion } from '../../../completionHelper';
import { position } from '../../../util';
import { getDocUri } from '../../path';

describe('Should use external file in Vue SFC', () => {
  const docUri = getDocUri('external/Foo.vue');

  it('Should work fine when template self close', async () => {
    await testCompletion(docUri, position(2, 0), ['<style> css-scoped.vue ✌']);
  });
});
