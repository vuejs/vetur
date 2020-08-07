import * as vscode from 'vscode';
import { sameLineRange, sleep } from '../../../util';
import { testDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';
import { showFile } from '../../../editorHelper';

describe('Should find correct diagnostics for sub folders with local `tsconfig.json`', () => {
  const docUri = getDocUri('diagnostics/customConfig/Switch.vue');

  before(async () => {
    await showFile(docUri);
    await sleep(3000);
  });

  it('shows diagnostic errors for <script> region', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        range: sameLineRange(9, 2, 9),
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

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
