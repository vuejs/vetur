import assert from 'assert';
import vscode, { Range, WorkspaceEdit } from 'vscode';
import { showFile } from '../../../editorHelper';
import { sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

describe('Should update import when rename files', () => {
  it('update imports', async () => {
    const docUri = getDocUri('renameFiles/Basic.vue');
    const beforeRenameRelative = 'renameFiles/Imported.vue';
    const afterRenameRelative = 'renameFiles/Imported2.vue';
    await testRename(docUri, beforeRenameRelative, afterRenameRelative);
  });
});

interface DocumentEdit {
  range: Range;
  uri: string;
  text: string;
}

async function testRename(docUri: vscode.Uri, beforeRename: string, afterRename: string) {
  await showFile(docUri);

  const renameEdit = new WorkspaceEdit();
  const beforeRenameUri = getDocUri(beforeRename);
  const afterRenameUri = getDocUri(afterRename);
  renameEdit.renameFile(beforeRenameUri, afterRenameUri);
  vscode.workspace.applyEdit(renameEdit);

  return new Promise<void>(resolve => {
    const timeout = 5000;
    const result: DocumentEdit[] = [];
    const expected: DocumentEdit[] = [
      {
        range: sameLineRange(5, 32, 32),
        text: '2',
        uri: docUri.toString()
      }
    ];
    const finishTest = () => {
      try {
        assert.deepStrictEqual(result, expected);
      } finally {
        const renameEdit = new WorkspaceEdit();
        renameEdit.renameFile(afterRenameUri, beforeRenameUri);
        vscode.workspace.applyEdit(renameEdit);
      }
      resolve();
    };

    setTimeout(finishTest, timeout);

    vscode.workspace.onDidChangeTextDocument(e => {
      result.push(
        ...e.contentChanges.map(change => ({ range: change.range, uri: e.document.uri.toString(), text: change.text }))
      );

      if (result.length === expected.length) {
        finishTest();
      }
    });
  });
}
