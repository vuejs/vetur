import * as vscode from 'vscode';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';
import { sameLineRange } from '../../../util';

describe('Should find common diagnostics for all regions', () => {
  const parentUri = getDocUri('diagnostics/propsValidation/parent.vue');

  it('shows errors for passing wrong props to child component', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<child> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(2, 4, 19)
      },
      {
        message: '<child> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(3, 4, 29)
      },
      {
        message: '<child> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(4, 4, 30)
      },
      {
        message: '<child> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(5, 4, 58)
      },
      {
        message: '<child> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(8, 4, 52)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });
});
