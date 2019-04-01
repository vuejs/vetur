import * as vscode from 'vscode';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { sameLineRange, range, getDocUri } from '../util';
import { testDiagnostics } from './helper';
import { DiagnosticTag } from 'vscode-languageclient';

describe('Should find common diagnostics for all regions', () => {
  const docUri = getDocUri('client/diagnostics/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows diagnostic errors for <script> region', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        range: sameLineRange(25, 4, 5),
        severity: vscode.DiagnosticSeverity.Error,
        message: "',' expected."
      },
      {
        range: sameLineRange(7, 9, 12),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Argument of type '\"5\"' is not assignable to parameter of type 'number'."
      },
      {
        range: sameLineRange(8, 0, 29),
        severity: vscode.DiagnosticSeverity.Error,
        message: "'Item' is declared but its value is never read.",
        tags: [DiagnosticTag.Unnecessary]
      },
      {
        range: sameLineRange(8, 17, 29),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find module './Void.vue'."
      },
      {
        range: sameLineRange(11, 16, 19),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find name 'Ite'."
      },
      {
        range: range(17, 2, 21, 3),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Argument of type '{ components: { Ite: any; };"
      },
      {
        range: sameLineRange(24, 14, 16),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Property 'lo' does not exist on type 'Console'."
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
