import * as vscode from 'vscode';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { sameLineRange, getDocUri } from '../util';
import { testDiagnostics } from './helper';

describe('Should find correct diagnostics for sub folders with local `tsconfig.json`', () => {
  const docUri = getDocUri('client/diagnostics/custom-config/Switch.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows diagnostic errors for <script> region', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        range: sameLineRange(9, 2, 6),
        severity: vscode.DiagnosticSeverity.Error,
        message: 'Fallthrough case in switch.',
        code: 7029
      },
      {
        range: sameLineRange(6, 18, 30),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find module '@/notFound'."
      }
    ];

    const unexpectedDiagnostics: vscode.Diagnostic[] = [
      {
        range: sameLineRange(5, 19, 29),
        severity: vscode.DiagnosticSeverity.Error,
        message: "Cannot find module '@/logger'."
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics, unexpectedDiagnostics);
  });
});
