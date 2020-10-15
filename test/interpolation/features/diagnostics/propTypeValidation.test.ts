import { getDocUri } from '../../path';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { sameLineRange } from '../../../util';
import { DiagnosticSeverity } from 'vscode';

describe('Should find prop type valiation errors', () => {
  const rightUri = getDocUri('diagnostics/propTypeValidation/ParentRight.vue');
  const wrongUri = getDocUri('diagnostics/propTypeValidation/ParentWrong.vue');

  it('Shows no error for correct types', async () => {
    await testNoDiagnostics(rightUri);
  });

  it('Shows errors for incorrect types', async () => {
    await testDiagnostics(wrongUri, [
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'string'.",
        range: sameLineRange(2, 15, 18),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'boolean'.",
        range: sameLineRange(2, 28, 32),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'Function'.",
        range: sameLineRange(2, 42, 50),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'string'.",
        range: sameLineRange(3, 15, 18),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'boolean'.",
        range: sameLineRange(3, 28, 32),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type '() => void'.",
        range: sameLineRange(3, 42, 50),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type 'number[]' is not assignable to type 'string[]'.\n  Type 'number' is not assignable to type 'string'.",
        range: sameLineRange(3, 60, 63),
        source: 'Vetur',
        code: 2322
      }
    ]);
  });
});
