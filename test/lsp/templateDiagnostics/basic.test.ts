import * as vscode from 'vscode';
import { activateLS, showFile, sleep, FILE_LOAD_SLEEP_TIME } from '../helper';
import { getDocUri } from '../util';
import { sameLineRange } from '../../lsp-ts-28/util';
import { testDiagnostics } from '../diagnostics/helper';

describe('template-diag Should find diagnostics in <template> region', () => {
  const docUri = getDocUri('client/templateDiagnostics/expression.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  const tests: TemplateDiagnosticTest[] = [
    {
      file: 'expression.vue',
      diagnostics: [
        {
          range: sameLineRange(1, 8, 16),
          severity: vscode.DiagnosticSeverity.Error,
          message: "Property 'messaage' does not exist on type"
        }
      ]
    },
    {
      file: 'v-for.vue',
      diagnostics: [
        {
          range: sameLineRange(5, 15, 24),
          severity: vscode.DiagnosticSeverity.Error,
          message: "Property 'notExists' does not exist on type"
        }
      ]
    },
    {
      file: 'object-literal.vue',
      diagnostics: [
        {
          range: sameLineRange(3, 9, 12),
          severity: vscode.DiagnosticSeverity.Error,
          message: "Property 'bar' does not exist on type"
        }
      ]
    },
    // Todo: This crashes on template transformation. Fix it.
    // {
    //   file: 'v-on.vue',
    //   diagnostics: [
    //     {
    //       range: sameLineRange(9, 31, 34),
    //       severity: vscode.DiagnosticSeverity.Error,
    //       message: "Argument of type '123' is not assignable to parameter of type 'string'"
    //     },
    //     {
    //       range: sameLineRange(9, 31, 34),
    //       severity: vscode.DiagnosticSeverity.Error,
    //       message: `Type '"test"' is not assignable to type 'number'`
    //     }
    //   ]
    // },
    {
      file: 'class.vue',
      diagnostics: []
    },
    {
      file: 'style.vue',
      diagnostics: []
    },
    {
      file: 'directive.vue',
      diagnostics: [
        {
          range: sameLineRange(1, 22, 25),
          severity: vscode.DiagnosticSeverity.Error,
          message: "Property 'bar' does not exist on type"
        }
      ]
    }
  ];

  tests.forEach(t => {
    it(`Shows template diagnostics for ${t.file}`, async () => {
      const docUri = getDocUri(`client/templateDiagnostics/${t.file}`);
      await showFile(docUri);
      await sleep(FILE_LOAD_SLEEP_TIME);
      await testDiagnostics(docUri, t.diagnostics);
    });
  });
});

interface TemplateDiagnosticTest {
  file: string;
  diagnostics: vscode.Diagnostic[];
}
