import assert from 'assert';
import vscode from 'vscode';
import { RenameFilesParams, WillRenameFilesRequest } from 'vscode-languageclient';
import { sendLSRequest, showFile } from '../../../editorHelper';
import { getDocUri } from '../../path';

describe('Should update import when rename files', () => {
  it('update imports', async () => {
    const docUri = getDocUri('renameFiles/Basic.vue');
    const beforeRenameRelative = 'renameFiles/Imported.vue';
    const afterRenameRelative = 'renameFiles/Imported2.vue';
    await testRename(docUri, beforeRenameRelative, afterRenameRelative);
  });
});

async function testRename(docUri: vscode.Uri, beforeRename: string, afterRename: string) {
  await showFile(docUri);

  const beforeRenameUri = getDocUri(beforeRename);
  const afterRenameUri = getDocUri(afterRename);

  const res = await sendLSRequest(WillRenameFilesRequest.type, {
    files: [{ newUri: afterRenameUri.toString(), oldUri: beforeRenameUri.toString() }]
  } as RenameFilesParams);

  assert.deepStrictEqual(res, {
    documentChanges: [
      {
        textDocument: {
          uri: docUri.toString(),
          version: 0
        },
        edits: [
          {
            newText: './Imported2.vue',
            range: {
              start: {
                line: 5,
                character: 22
              },
              end: {
                line: 5,
                character: 36
              }
            }
          }
        ]
      }
    ]
  });
}
