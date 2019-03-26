import * as vscode from 'vscode';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { sameLineRange, getDocUri } from '../util';
import { testDiagnostics } from './helper';

describe('Should find diagnostics using eslint-plugin-vue', () => {
  const docUri = getDocUri('client/diagnostics/ESLint.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows diagnostic errors for template errors', async () => {
    const expectedDiagnostics: vscode.Diagnostic[] = [
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "\n[vue/require-v-for-key]\nElements in iteration expect to have 'v-bind:key' directives.",
        range: sameLineRange(2, 4, 23),
        source: 'eslint-plugin-vue'
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: "\n[vue/no-unused-vars]\n'i' is defined but never used.",
        range: sameLineRange(2, 15, 16),
        source: 'eslint-plugin-vue'
      },
      {
        severity: vscode.DiagnosticSeverity.Error,
        message: '\n[vue/valid-template-root]\nThe template root requires exactly one element.',
        range: sameLineRange(6, 2, 13),
        source: 'eslint-plugin-vue'
      }
    ];

    await testDiagnostics(docUri, expectedDiagnostics);
  });
});
