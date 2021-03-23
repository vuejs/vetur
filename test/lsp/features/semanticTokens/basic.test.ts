import assert from 'assert';
import vscode from 'vscode';
import { SemanticTokensRequest, SemanticTokensParams, SemanticTokens, SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver-protocol';
import { sendLSRequest, showFile } from '../../../editorHelper';
import { sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

function getTokenRange(line: number, startChar: number, identifier: string) {
  return sameLineRange(line, startChar, startChar + identifier.length);
}

describe('Should update import when rename files', () => {
  const docPath = 'semanticTokens/Basic.vue';
  const docUri = getDocUri(docPath);
  it('provide semantic tokens', async () => {
    await testSemanticTokens(docUri, encodeExpected([
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(7, 6, 'aConst'),
        modifiers: [SemanticTokenModifiers.declaration, SemanticTokenModifiers.readonly],
      },
      {
        type: SemanticTokenTypes.class,
        range: getTokenRange(9, 15, 'Vue'),
        modifiers: [],
      },
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(9, 19, 'extend'),
        modifiers: [],
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
    ]));
  });

  async function testSemanticTokens(uri: vscode.Uri, expected: number[], range?: vscode.Range) {
    await showFile(docUri);

    const result = await sendLSRequest<SemanticTokens>(SemanticTokensRequest.method, {
      textDocument: {
        uri: uri.toString(),
      }
    } as SemanticTokensParams);
    assertResult(result!.data, expected);
  }
});

/**
 *  group result by tokens to better distinguish
 */
function assertResult(actual: number[], expected: number[]) {
  const actualGrouped = group(actual);
  const expectedGrouped = group(expected);

  assert.deepStrictEqual(actualGrouped, expectedGrouped);
}

function group(tokens: number[]) {
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

function encodeExpected(tokens: UnEncodedSemanticTokenData[]) {
  const builder = new vscode.SemanticTokensBuilder(getLegend());

  for (const token of tokens) {    
    builder.push(
      token.range,
      token.type,
      token.modifiers
    );
  }

  return Array.from(builder.build().data);
}

// TODO: change to use built in command once test target is vscode 1.53
function getLegend(): vscode.SemanticTokensLegend {
  return {
    tokenModifiers: [
      SemanticTokenModifiers.declaration,
      SemanticTokenModifiers.static,
      SemanticTokenModifiers.async,
      SemanticTokenModifiers.readonly,
      SemanticTokenModifiers.defaultLibrary,
      'local'
    ],
    tokenTypes: [
      SemanticTokenTypes.class,
      SemanticTokenTypes.enum,
      SemanticTokenTypes.interface,
      SemanticTokenTypes.namespace,
      SemanticTokenTypes.typeParameter,
      SemanticTokenTypes.type,
      SemanticTokenTypes.parameter,
      SemanticTokenTypes.variable,
      SemanticTokenTypes.enumMember,
      SemanticTokenTypes.property,
      SemanticTokenTypes.function,
      SemanticTokenTypes.method
    ]
  };
}
