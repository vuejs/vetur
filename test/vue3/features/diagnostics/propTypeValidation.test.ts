import { getDocUri } from '../../path';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { sameLineRange } from '../../../util';
import { DiagnosticSeverity } from 'vscode';

describe('Should find prop type validation errors', () => {
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
        range: sameLineRange(1, 13, 16),
        source: 'Vetur'
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '{ count: number; isZeroCount: boolean; zeroToCount: number[]; }' is not assignable to type 'boolean'.",
        range: sameLineRange(1, 32, 36),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'boolean' is not assignable to type 'Function'.",
        range: sameLineRange(1, 46, 54),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'number' is not assignable to type 'string'.",
        range: sameLineRange(2, 13, 16),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '{ count: number; isZeroCount: boolean; zeroToCount: number[]; }' is not assignable to type 'boolean'.",
        range: sameLineRange(2, 32, 36),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message: "Type 'boolean' is not assignable to type '() => void'.",
        range: sameLineRange(2, 46, 54),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type 'number[]' is not assignable to type 'string[]'.\n  Type 'number' is not assignable to type 'string'.",
        range: sameLineRange(2, 76, 79),
        source: 'Vetur',
        code: 2322
      }
    ]);
  });
});
