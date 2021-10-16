import vscode, { MarkdownString, MarkedString } from 'vscode';
import assert from 'assert';
import { showFile } from './editorHelper';

export async function testHover(docUri: vscode.Uri, position: vscode.Position, expectedHover: vscode.Hover) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeHoverProvider',
    docUri,
    position
  )) as vscode.Hover[];

  if (!result[0]) {
    throw Error('Hover failed');
  }

  const contents = result[0].contents;
  contents.forEach((c, i) => {
    const actualContent = markedStringToSTring(c);
    const expectedContent = markedStringToSTring(expectedHover.contents[i]);
    assert.ok(actualContent.startsWith(expectedContent), `Expecting\n${expectedContent}\nGot\n${actualContent}`);
  });

  if (result[0] && result[0].range) {
    assert.ok(result[0].range!.isEqual(expectedHover.range!));
  }
}

function markedStringToSTring(s: MarkdownString | MarkedString) {
  return typeof s === 'string' ? s : s.value;
}
