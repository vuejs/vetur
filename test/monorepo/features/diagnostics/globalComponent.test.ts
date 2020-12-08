import vscode from 'vscode';
import { sameLineRange } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics using global components', () => {
  const docUri = getDocUri('packages/vue3/src/App.vue');

  it('shows diagnostic errors for template errors', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: '<app-button> misses props: text\n',
        range: sameLineRange(2, 2, 27)
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
