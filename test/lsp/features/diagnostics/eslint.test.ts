import vscode from 'vscode';
import { sameLineRange } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics using eslint-plugin-vue', () => {
  const docUri = getDocUri('diagnostics/ESLint.vue');

  it('shows diagnostic errors for template errors', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "[vue/require-v-for-key]\nElements in iteration expect to have 'v-bind:key' directives.",
        range: sameLineRange(2, 4, 23),
        source: 'eslint-plugin-vue'
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "[vue/no-unused-vars]\n'i' is defined but never used.",
        range: sameLineRange(2, 15, 16),
        source: 'eslint-plugin-vue'
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: '[vue/no-multiple-template-root]\nThe template root requires exactly one element.',
        range: sameLineRange(6, 2, 13),
        source: 'eslint-plugin-vue'
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
