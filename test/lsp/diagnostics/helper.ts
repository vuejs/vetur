import * as vscode from 'vscode';
import * as assert from 'assert';
import { sleep } from '../../helper';

export async function testDiagnostics(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedDiagnostics: vscode.Diagnostic[]
) {
  // For diagnostics to show up
  await sleep(2000);

  const result = vscode.languages.getDiagnostics(docUri);

  expectedDiagnostics.forEach(ed => {
    assert.ok(result.some(d => {
      return isEqualDiagnostic(d, ed);
    }));
  });

  function isEqualDiagnostic(d1: vscode.Diagnostic, d2: vscode.Diagnostic) {
    const sourceIsEqual = d1.source
      ? d1.source === d2.source
      : true;

    return d1.severity === d2.severity &&
      d1.message === d2.message &&
      d1.range.isEqual(d2.range) &&
      sourceIsEqual;
  }
}