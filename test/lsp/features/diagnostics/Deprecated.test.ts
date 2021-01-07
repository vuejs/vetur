import vscode from 'vscode';
import { DiagnosticTag } from 'vscode-languageclient';
import { sameLineRange } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics for deprecated code', () => {
  const docUri = getDocUri('diagnostics/Deprecated.vue');

  it('shows diagnostic errors for deprecated function', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Hint,
        message: "'createReturn' is deprecated",
        range: sameLineRange(2, 3, 15),
        tags: [DiagnosticTag.Deprecated]
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
