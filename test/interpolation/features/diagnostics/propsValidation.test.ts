import * as vscode from 'vscode';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';
import { sameLineRange } from '../../../util';

describe('Should find common diagnostics for all regions', () => {
  const parentUri = getDocUri('diagnostics/propsValidation/parent.vue');

  it('shows errors for passing wrong props to child component', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<child-comp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(2, 4, 29)
      },
      {
        message: '<child-comp> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(3, 4, 39)
      },
      {
        message: '<child-comp> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(4, 4, 40)
      },
      {
        message: '<child-comp> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(5, 4, 68)
      },
      {
        message: '<child-comp> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(8, 4, 62)
      },
      {
        message: '<ChildComp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(9, 4, 17)
      },
      {
        message: '<ChildComp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(10, 4, 27)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });
});
