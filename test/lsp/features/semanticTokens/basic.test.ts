import { SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver-protocol';
import { getTokenRange, testSemanticTokens } from '../../../semanticTokenHelper';
import { getDocUri } from '../../path';

describe('semantic tokens', () => {
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
});
