import { activateLS, showFile } from '../helper';
import { getDocUri } from '../util';
import { testNoDiagnostics } from '../features/diagnostics/helper';

describe('Should find common diagnostics for all regions', () => {
  const docUri = getDocUri('client/diagnostics/Parent.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
  });

  it('shows no diagnostics error for <script> region', async () => {
    await testNoDiagnostics(docUri);
  });
});
