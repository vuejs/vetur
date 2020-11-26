import { testNoDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find no error when no root template element', () => {
  const docUri = getDocUri('diagnostics/issue-1336.vue');

  it('shows no diagnostics error without root template element area', async () => {
    await testNoDiagnostics(docUri);
  });
});
