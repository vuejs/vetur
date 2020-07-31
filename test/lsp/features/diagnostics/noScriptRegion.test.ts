import { activateLS, showFile } from '../../helper';
import { getDocUri } from '../../util';
import { testNoDiagnostics } from './helper';

describe('Should find no error when <script> is not present', () => {
  const childUri = getDocUri('diagnostics/noScriptRegion/Child.vue');
  const parentUri = getDocUri('diagnostics/noScriptRegion/Parent.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(childUri);
    await showFile(parentUri);
  });

  it('shows no diagnostics error for component without <script> region', async () => {
    await testNoDiagnostics(childUri);
  });

  it('shows no diagnostics error when importing a component without <script> region ', async () => {
    await testNoDiagnostics(parentUri);
  });
});
