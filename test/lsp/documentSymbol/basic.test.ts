import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateLS, sleep, showFile, FILE_LOAD_SLEEP_TIME } from '../../helper';
import { range } from '../util';

describe('Should do documentSymbol', () => {
  const docUri = getDocUri('client/documentSymbol/Basic.vue');

  before('activate', async () => {
    await activateLS();
    await showFile(docUri);
    await sleep(FILE_LOAD_SLEEP_TIME);
  });

  it('shows all documentSymbols for Basic.vue', async () => {
    await testSymbol(docUri, [
      {
        name: '"Basic.vue"',
        kind: 1,
        range: range(0, 0, 13, 0),
        children: [
          {
            name: 'template',
            range: range(0, 0, 3, 11),
            kind: 7,
            children: [
              {
                name: 'div.counter-wrapper',
                range: range(1, 2, 2, 8),
                kind: 7
              }
            ]
          }
        ]
      },
      {
        name: 'script',
        range: range(5, 0, 13, 9),
        kind: 7,
        children: [
          {
            name: 'data',
            kind: 5,
            range: range(7, 2, 11, 3)
          }
        ]
      },
      {
        name: 'style',
        range: range(15, 0, 19, 8),
        kind: 7,
        children: [
          {
            name: '.counter-wrapper > *',
            kind: 4,
            range: range(16, 0, 18, 1)
          }
        ]
      }
    ]);
  });
});

// From: https://stackoverflow.com/a/51365037
type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object ? RecursivePartial<T[P]> : T[P]
};

// From: @Coder-256
function assertDeepEqual<T>(actual: T, expected: RecursivePartial<T>) {
  if (expected instanceof Array) {
    if (actual instanceof Array) {
      for (let i = 0; i < expected.length; i++) {
        assertDeepEqual(actual[i], expected[i]);
      }
    } else {
      typeMismatch();
    }
  } else if (expected instanceof Object) {
    if (actual instanceof Object) {
      for (const key of Object.keys(expected)) {
        assertDeepEqual((actual as any)[key], (expected as any)[key]);
      }
    } else {
      typeMismatch();
    }
  } else {
    assert.strictEqual(actual, expected);
  }

  function typeMismatch() {
    assert.fail(
      new Error(
        'Type of input A expected to match type of input B.\n+ expected - actual\n- ' +
          JSON.stringify(actual, null, 2) +
          '\n+ ' +
          JSON.stringify(expected, null, 2)
      )
    );
  }
}

async function testSymbol(docUri: vscode.Uri, expectedSymbols: RecursivePartial<vscode.DocumentSymbol>[]) {

  await showFile(docUri);
  await sleep(2000);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeDocumentSymbolProvider',
    docUri
  )) as vscode.DocumentSymbol[];

  assertDeepEqual(result, expectedSymbols);
}
