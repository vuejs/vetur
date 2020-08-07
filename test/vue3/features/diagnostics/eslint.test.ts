import { getDocUri } from '../../path';
import { testNoDiagnostics } from '../../../diagnosticHelper';

describe('Should find diagnostics using eslint-plugin-vue', () => {
  const docUri = getDocUri('diagnostics/ESLint.vue');

  it('shows no error for multi-root template, which is valid in v3', async () => {
    await testNoDiagnostics(docUri);
  });
});
