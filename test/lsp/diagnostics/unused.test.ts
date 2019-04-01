import * as vscode from 'vscode';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { sameLineRange, getDocUri } from '../util';
import { testDiagnostics } from './helper';
import { DiagnosticTag } from 'vscode-languageclient';

describe('Should find diagnostics for unused variables', () => {
  const docUri = getDocUri('client/diagnostics/Unused.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

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
