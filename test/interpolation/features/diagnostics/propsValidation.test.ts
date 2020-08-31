import * as vscode from 'vscode';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';
import { sameLineRange } from '../../../util';

describe('Should find common diagnostics for all regions', () => {
  const parentUri = getDocUri('diagnostics/propsValidation/parent.vue');

  it('shows warnings for passing wrong props to child component when array def', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<child-comp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(2, 4, 29)
      },
      {
        message: '<child-comp> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(3, 4, 39)
      },
      {
        message: '<child-comp> misses props: bar, b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(4, 4, 40)
      },
      {
        message: '<child-comp> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(5, 4, 68)
      },
      {
        message: '<child-comp> misses props: b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(8, 4, 62)
      },
      {
        message: '<ChildComp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(9, 4, 17)
      },
      {
        message: '<ChildComp> misses props: foo, bar, b-az',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(10, 4, 27)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });

  it('shows warnings for passing wrong props to child component when object def', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<object-child> misses props: foo, bar',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(14, 4, 20)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });

  it('shows errors for passing wrong props to child component when detailed object def', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<detailed-child> misses props: foo, bar',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(11, 4, 22)
      },
      {
        message: '<detailed-child> misses props: bar',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(12, 4, 33)
      },
      {
        message: '<detailed-child> misses props: foo',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(13, 4, 32)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });

  it('shows errors or warnings for passing wrong props to child component when class def', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        message: '<class-child> misses props: bar, ear, far, name, checked, foo',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(15, 4, 19)
      },
      {
        message: '<class-child> misses props: bar, far, name, checked, foo',
        severity: vscode.DiagnosticSeverity.Error,
        range: sameLineRange(16, 4, 29)
      },
      {
        message: '<class-child> misses props: bar, far, name, foo',
        severity: vscode.DiagnosticSeverity.Warning,
        range: sameLineRange(17, 4, 45)
      }
    ];

    await testDiagnostics(parentUri, expectedDiagnostics);
  });
});
