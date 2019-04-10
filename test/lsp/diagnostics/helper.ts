import * as vscode from 'vscode';
import * as assert from 'assert';
import { sleep } from '../helper';
import * as _ from 'lodash';

export async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
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

  function isEqualDiagnostic(ed: vscode.Diagnostic, ad: vscode.Diagnostic) {
    const sourcesAreEqual = ed.source ? ed.source === ad.source : true;

    // Disable until https://github.com/Microsoft/vscode/issues/71556 is resolved
    // const tagsAreEqual = d1.tags ? _.isEqual(d1.tags, d2.tags) : true;
    const tagsAreEqual = true;

    // Only check beginning equality as TS's long messages are ever-changing
    const messaagesAreEqual =
      ed.message.length === ad.message.length ? ed.message === ad.message : ad.message.startsWith(ed.message);

    return (
      ed.severity === ad.severity && messaagesAreEqual && ed.range.isEqual(ad.range) && tagsAreEqual && sourcesAreEqual
    );
  }
}
