import vscode from 'vscode';
import assert from 'assert';
import _ from 'lodash';
import { sleep } from './util';
import { showFile } from './editorHelper';
import { performance } from 'perf_hooks';

export async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
  await showFile(docUri);

  const result = await getDiagnosticsAndTimeout(docUri);

  expectedDiagnostics.forEach(ed => {
    assert.ok(
      result.some(d => {
        return isEqualDiagnostic(ed, d);
      }),
      `Cannot find matching diagnostics for\n${ed.message}\n\n${JSON.stringify(ed, null, 2)}\n\n` +
        `Seen diagnostics are:\n${JSON.stringify(result, null, 2)}`
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

export async function testNoDiagnostics(docUri: vscode.Uri) {
  await showFile(docUri);
  // For diagnostics to show up
  await sleep(5000);

  const result = vscode.languages.getDiagnostics(docUri);

  assert.ok(
    result.length === 0,
    `Should find no diagnostics for ${docUri.fsPath} but found:\n` + `${JSON.stringify(result, null, 2)}`
  );
}

// Retry to get diagnostics until length > 0 or timeout
export async function getDiagnosticsAndTimeout(docUri: vscode.Uri, timeout = 5000) {
  const startTime = performance.now();

  let result = vscode.languages.getDiagnostics(docUri);

  while (result.length <= 0 && startTime + timeout > performance.now()) {
    result = vscode.languages.getDiagnostics(docUri);
    await sleep(100);
  }

  return result;
}
