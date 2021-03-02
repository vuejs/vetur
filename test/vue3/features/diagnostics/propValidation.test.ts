import { getDocUri } from '../../path';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { sameLineRange } from '../../../util';
import { DiagnosticSeverity } from 'vscode';

describe('Should find prop validation errors', () => {
  const rightUri = getDocUri('diagnostics/propValidation/ParentRight.vue');

  it('shows no diagnostics error for prop validator in vue3 v-model', async () => {
    await testNoDiagnostics(rightUri);
  });
});
