import vscode from 'vscode';
import { DiagnosticTag } from 'vscode-languageclient';
import { sameLineRange } from '../../../util';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics for script setup', () => {
  const doc1Uri = getDocUri('diagnostics/scriptSetup1.vue');
  const doc2Uri = getDocUri('diagnostics/scriptSetup2.vue');
  const docDiagUri = getDocUri('diagnostics/scriptSetupDiag.vue');

  it('shows no diagnostics error for script setup 1', async () => {
    await testNoDiagnostics(doc1Uri);
  });

  it('shows no diagnostics error for script setup 2', async () => {
    await testNoDiagnostics(doc2Uri);
  });

  it('shows diagnostic errors for script setup', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Hint,
        message: "'a' is declared but its value is never read.",
        range: sameLineRange(13, 8, 9),
        tags: [DiagnosticTag.Unnecessary]
      },
      {
        severity: vscode.DiagnosticSeverity.Hint,
        message: "'b' is declared but its value is never read.",
        range: sameLineRange(14, 11, 12),
        tags: [DiagnosticTag.Unnecessary]
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "Type 'boolean' is not assignable to type 'string'.",
        range: sameLineRange(20, 6, 7),
        tags: [DiagnosticTag.Unnecessary]
      }
    ];

    await testDiagnostics(docDiagUri, expectedDiagnostics);
  });
});
