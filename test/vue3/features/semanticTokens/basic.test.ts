import { SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver-protocol';
import { getTokenRange, testSemanticTokens } from '../../../semanticTokenHelper';
import { getDocUri } from '../../path';

describe('semantic tokens', () => {
  const docPath = 'semanticTokens/Basic.vue';
  const docUri = getDocUri(docPath);

  it('provide semantic tokens', async () => {
    await testSemanticTokens(docUri, [
      {
        type: SemanticTokenTypes.method,
        range: getTokenRange(7, 2, 'setup'),
        modifiers: [SemanticTokenModifiers.declaration]
      },
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(8, 10, 'a'),
        modifiers: [SemanticTokenModifiers.readonly, SemanticTokenModifiers.declaration, 'local']
      },
      {
        type: SemanticTokenTypes.function,
        range: getTokenRange(8, 14, 'ref'),
        modifiers: []
      },
      {
        type: SemanticTokenTypes.variable,
        range: getTokenRange(10, 4, 'a'),
        modifiers: [SemanticTokenModifiers.readonly, 'local']
      },
      {
        type: SemanticTokenTypes.property,
        range: getTokenRange(10, 6, 'value'),
        modifiers: ['refValue']
      }
    ]);
  });
});
