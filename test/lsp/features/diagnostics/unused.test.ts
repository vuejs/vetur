import vscode from 'vscode';
import { DiagnosticTag } from 'vscode-languageclient';
import { sameLineRange } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics for unused variables', () => {
  const docUri = getDocUri('diagnostics/Unused.vue');

  it('shows diagnostic errors for unused variables', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "'lodash' is declared but its value is never read.",
        range: sameLineRange(5, 0, 33),
        tags: [DiagnosticTag.Unnecessary]
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "'foo' is declared but its value is never read.",
        range: sameLineRange(7, 6, 9),
        tags: [DiagnosticTag.Unnecessary]
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
