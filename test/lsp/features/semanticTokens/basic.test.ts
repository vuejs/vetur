import assert from 'assert';
import vscode from 'vscode';
import { SemanticTokensParams, SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver-protocol';
import { showFile } from '../../../editorHelper';
import { sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

function getTokenRange(line: number, startChar: number, identifier: string) {
  return sameLineRange(line, startChar, startChar + identifier.length);
}

describe('Should update import when rename files', () => {
  const docPath = 'semanticTokens/Basic.vue';
  const docUri = getDocUri(docPath);
  it('provide semantic tokens', async () => {
    await testSemanticTokens(docUri, [
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(7, 6, 'aConst'),
        modifiers: [SemanticTokenModifiers.declaration, SemanticTokenModifiers.readonly]
      },
      {
        type: SemanticTokenTypes.class,
        range: getTokenRange(9, 15, 'Vue'),
        modifiers: []
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(9, 19, 'extend'),
        modifiers: []
      },
      {
        type: SemanticTokenTypes.property,
        range: getTokenRange(10, 2, 'methods'),
        modifiers: [SemanticTokenModifiers.declaration]
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(11, 4, 'abc'),
        modifiers: [SemanticTokenModifiers.declaration]
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(12, 11, 'log'),
        modifiers: []
      },
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(12, 15, 'aConst'),
        modifiers: [SemanticTokenModifiers.readonly]
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(14, 4, 'log'),
        modifiers: [SemanticTokenModifiers.declaration]
      },
      {
        type: SemanticTokenTypes.parameter,
        range: getTokenRange(14, 8, 'str'),
        modifiers: [SemanticTokenModifiers.declaration]
      },
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(15, 6, 'console'),
        modifiers: [SemanticTokenModifiers.defaultLibrary]
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(15, 14, 'log'),
        modifiers: [SemanticTokenModifiers.defaultLibrary]
      },
      {
        type: SemanticTokenTypes.parameter,
        range: getTokenRange(15, 18, 'str'),
        modifiers: []
      }
    ]);
  });

  async function testSemanticTokens(uri: vscode.Uri, expected: UnEncodedSemanticTokenData[]) {
    await showFile(docUri);

    const result = await vscode.commands.executeCommand<vscode.SemanticTokens>(
      'vscode.provideDocumentSemanticTokens',
      uri
    );
    assertResult(result!.data, encodeExpected(await getLegend(uri), expected));
  }
});

/**
 *  group result by tokens to better distinguish
 */
function assertResult(actual: Uint32Array, expected: number[]) {
  const actualGrouped = group(actual);
  const expectedGrouped = group(expected);

  assert.deepStrictEqual(actualGrouped, expectedGrouped);
}

function group(tokens: Uint32Array | number[]) {
  const result: number[][] = [];

  let index = 0;
  while (index < tokens.length) {
    result.push(Array.from(tokens.slice(index, (index += 5))));
  }

  return result;
}

interface UnEncodedSemanticTokenData {
  range: vscode.Range;
  type: string;
  modifiers: string[];
}

function encodeExpected(legend: vscode.SemanticTokensLegend, tokens: UnEncodedSemanticTokenData[]) {
  const builder = new vscode.SemanticTokensBuilder(legend);

  for (const token of tokens) {
    builder.push(token.range, token.type, token.modifiers);
  }

  return Array.from(builder.build().data);
}

async function getLegend(uri: vscode.Uri): Promise<vscode.SemanticTokensLegend> {
  const res = await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
    'vscode.provideDocumentSemanticTokensLegend',
    uri
  );

  return res!;
}
