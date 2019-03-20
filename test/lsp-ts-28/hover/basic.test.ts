import * as vscode from 'vscode';
import * as assert from 'assert';
import { activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../helper';
import { position, sameLineRange, getDocUri } from '../util';

describe('Should do hover', () => {
  const docUri = getDocUri('client/hover/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows hover for <img> tag', async () => {
    await testHover(docUri, position(4, 7), {
      contents: ['An img element represents an image\\.'],
      range: sameLineRange(4, 7, 10)
    });
  });

  it('shows hover for this.msg', async () => {
    await testHover(docUri, position(33, 23), {
      contents: ['\n```ts\n(property) msg: string\n```\n'],
      range: sameLineRange(33, 23, 26)
    });
  });

  it('shows hover for `width` in <style>', async () => {
    await testHover(docUri, position(47, 3), {
      contents: [
        // tslint:disable-next-line
        `Specifies the width of the content area, padding area or border area \\(depending on 'box\\-sizing'\\) of certain boxes\\.`
      ],
      range: sameLineRange(47, 2, 14)
    });
  });
});

async function testHover(docUri: vscode.Uri, position: vscode.Position, expectedHover: vscode.Hover) {
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
    const val = (c as any).value;
    assert.equal(val, expectedHover.contents[i]);
  });

  if (result[0] && result[0].range) {
    assert.ok(result[0].range!.isEqual(expectedHover.range!));
  }
}
