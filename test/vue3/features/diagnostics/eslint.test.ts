import { activateLS, showFile } from '../../helper';
import { getDocUri } from '../../util';
import { testNoDiagnostics } from './helper';

describe('Should find diagnostics using eslint-plugin-vue', () => {
  const docUri = getDocUri('diagnostics/ESLint.vue');

  before('activate', async () => {
    await activateLS();
  });

  it('shows no error for multi-root template, which is valid in v3', async () => {
    await testNoDiagnostics(docUri);
  });
});
