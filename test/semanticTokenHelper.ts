import assert from 'assert';
import vscode from 'vscode';
import { showFile } from './editorHelper';
import { sameLineRange } from './util';

/**
 *  group result by tokens to better distinguish
 */
export function assertResult(actual: Uint32Array, expected: number[]) {
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

export interface UnEncodedSemanticTokenData {
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

export async function testSemanticTokens(docUri: vscode.Uri, expected: UnEncodedSemanticTokenData[]) {
  await showFile(docUri);

  const result = await vscode.commands.executeCommand<vscode.SemanticTokens>(
    'vscode.provideDocumentSemanticTokens',
    docUri
  );
  assertResult(result!.data, encodeExpected(await getLegend(docUri), expected));
}

export function getTokenRange(line: number, startChar: number, identifier: string) {
  return sameLineRange(line, startChar, startChar + identifier.length);
}
