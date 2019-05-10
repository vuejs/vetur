import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, getDocUri } from '../util';
import { testCompletion } from './helper';

describe('Should autocomplete for <script>', () => {
  const scriptDocUri = getDocUri('client/completion/script/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(scriptDocUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
    // TS LS completion starts slow.
    await sleep(2000);
  });

  it('completes module names when importing', async () => {
    await testCompletion(scriptDocUri, position(5, 8), ['lodash', 'vue', 'vuex']);
  });

  it('completes for this.', async () => {
    await testCompletion(scriptDocUri, position(15, 11), ['foo', 'bar', '$store', '$router', '$el', '$data']);
  });

  it('completes for lodash methods with _.', async () => {
    await testCompletion(scriptDocUri, position(18, 8), ['curry', 'fill']);
  });

  it('completes Vue default export methods', async () => {
    await testCompletion(scriptDocUri, position(20, 4), ['data', 'props', 'mounted']);
  });
});
