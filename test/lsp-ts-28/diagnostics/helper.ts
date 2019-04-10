import * as vscode from 'vscode';
import * as assert from 'assert';
import { sleep } from '../helper';

export async function testDiagnostics(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedDiagnostics: vscode.Diagnostic[]
) {
  // For diagnostics to show up
  await sleep(2000);

  const result = vscode.languages.getDiagnostics(docUri);

  expectedDiagnostics.forEach(ed => {
    assert.ok(
      result.some(d => {
        return isEqualDiagnostic(ed, d);
      }),
      `Cannot find matching diagnostics for ${ed.message}\n${JSON.stringify(ed)}\n` +
        `Seen diagnostics are:\n${JSON.stringify(result)}`
    );
  });

  function isEqualDiagnostic(d1: vscode.Diagnostic, d2: vscode.Diagnostic) {
    const sourceIsEqual = d1.source ? d1.source === d2.source : true;

    return (
      d1.severity === d2.severity &&
      // Only check beginning equality as TS's long messages are ever-changing
      d1.message.slice(0, 40) === d2.message.slice(0, 40) &&
      // d1.range.isEqual(d2.range) &&
      isRangeEqual(d1.range, d2.range) &&
      sourceIsEqual
    );
  }
}

function isRangeEqual(r1: vscode.Range, r2: vscode.Range) {
  return (
    r1.start.line === r2.start.line &&
    r1.start.character === r2.start.character &&
    r1.end.line === r2.end.line &&
    r1.end.character === r2.end.character
  );
}
