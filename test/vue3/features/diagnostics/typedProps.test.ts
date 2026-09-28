import { getDocUri } from '../../path';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { sameLineRange } from '../../../util';
import { DiagnosticSeverity } from 'vscode';

describe('Typed component instance props', () => {
  it('accepts private types and omitted optional/defaulted props', async () => {
    await testNoDiagnostics(getDocUri('diagnostics/typedProps/ParentRight.vue'));
  });

  it('checks private, class and generic props at their template locations', async () => {
    await testDiagnostics(getDocUri('diagnostics/typedProps/ParentWrong.vue'), [
      ...[
        [2, 29, 31],
        [3, 35, 37],
        [4, 31, 33]
      ].map(([line, start, end]) => ({
        severity: DiagnosticSeverity.Error,
        message: "Type 'string' is not assignable to type 'number'.",
        range: sameLineRange(line, start, end),
        source: 'Vetur',
        code: 2322
      })),
      {
        severity: DiagnosticSeverity.Error,
        message: 'Type \'number\' is not assignable to type \'"ready" | "waiting" | undefined\'.',
        range: sameLineRange(2, 58, 68),
        source: 'Vetur',
        code: 2322
      }
    ]);
  });
});
