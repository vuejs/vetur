import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete for <script>', () => {
  const basicUri = getDocUri('completion/script/Basic.vue');
  const hyphenUri = getDocUri('completion/script/Hyphen.vue');

  it('completes module names when importing', async () => {
    await testCompletion(basicUri, position(5, 8), ['lodash', 'vue', 'vuex']);
  });

  it('completes for this.', async () => {
    await testCompletion(basicUri, position(15, 11), ['foo', 'bar', '$store', '$router', '$el', '$data']);
  });

  it('completes for lodash methods with _.', async () => {
    await testCompletion(basicUri, position(18, 8), ['curry', 'fill']);
  });

  it('completes Vue default export methods', async () => {
    await testCompletion(basicUri, position(20, 4), ['data', 'props', 'mounted']);
  });

  it('completes hyphen properties in object', async () => {
    await testCompletion(hyphenUri, position(6, 4), ['a', 'a-2']);
  });
});
