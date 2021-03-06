import vscode from 'vscode';
import { DiagnosticTag } from 'vscode-languageclient';
import { range, sameLineRange } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find common diagnostics for all regions and dot prefix name', () => {
  const docUri = getDocUri('diagnostics/.vitepress/Basic.vue');

  it('shows diagnostic errors for <script> region', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        range: sameLineRange(25, 4, 5),
        severity: vscode.DiagnosticSeverity.Error,
        message: "',' expected"
      },
      {
        range: sameLineRange(7, 9, 12),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Argument of type 'string' is not assignable to parameter of type 'number'."
      },
      {
        range: sameLineRange(8, 0, 29),
        severity: vscode.DiagnosticSeverity.Error,
        message: "'Item' is declared but its value is never read",
        tags: [DiagnosticTag.Unnecessary]
      },
      {
        range: sameLineRange(8, 17, 29),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find module './Void.vue'"
      },
      {
        range: sameLineRange(11, 16, 19),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find name 'Ite'. Did you mean 'Item'"
      },
      {
        range: range(17, 2, 21, 3),
        severity: vscode.DiagnosticSeverity.Error,
        message: 'No overload matches this call'
      },
      {
        range: sameLineRange(24, 14, 16),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Property 'lo' does not exist on type 'Console'"
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });

  it('shows diagnostic errors for <style> region', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: 'property value expected',
        range: sameLineRange(33, 0, 1),
        code: 'css-propertyvalueexpected',
        source: 'scss'
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
