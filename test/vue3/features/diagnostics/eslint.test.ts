import { activateLS, FILE_LOAD_SLEEP_TIME, showFile, sleep } from '../../helper';
import { getDocUri } from '../../util';
import { testNoDiagnostics } from './helper';

describe('Should find diagnostics using eslint-plugin-vue', () => {
  const docUri = getDocUri('diagnostics/ESLint.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows no error for multi-root template', async () => {
    await testNoDiagnostics(docUri);
  });
});
