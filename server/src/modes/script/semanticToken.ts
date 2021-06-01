import ts from 'typescript';
import { SemanticTokensLegend, SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver';
import { RuntimeLibrary } from '../../services/dependencyService';
import { RefTokensService } from '../../services/RefTokenService';
import { SemanticTokenOffsetData } from '../../types';

/* tslint:disable:max-line-length */
/**
 * extended from https://github.com/microsoft/TypeScript/blob/35c8df04ad959224fad9037e340c1e50f0540a49/src/services/classifier2020.ts#L9
 * so that we don't have to map it into our own legend
 */
export const enum TokenType {
  class,
  enum,
  interface,
  namespace,
  typeParameter,
  type,
  parameter,
  variable,
  enumMember,
  property,
  function,
  member
}

/* tslint:disable:max-line-length */
/**
 * adopted from https://github.com/microsoft/TypeScript/blob/35c8df04ad959224fad9037e340c1e50f0540a49/src/services/classifier2020.ts#L13
 * so that we don't have to map it into our own legend
 */
export const enum TokenModifier {
  declaration,
  static,
  async,
  readonly,
  defaultLibrary,
  local,

  // vue composition api
  refValue
}

export function getSemanticTokenLegends(): SemanticTokensLegend {
  const tokenModifiers: string[] = [];

  ([
    [TokenModifier.declaration, SemanticTokenModifiers.declaration],
    [TokenModifier.static, SemanticTokenModifiers.static],
    [TokenModifier.async, SemanticTokenModifiers.async],
    [TokenModifier.readonly, SemanticTokenModifiers.readonly],
    [TokenModifier.defaultLibrary, SemanticTokenModifiers.defaultLibrary],
    [TokenModifier.local, 'local'],

    // vue
    [TokenModifier.refValue, 'refValue']
  ] as const).forEach(([tsModifier, legend]) => (tokenModifiers[tsModifier] = legend));

  const tokenTypes: string[] = [];

  ([
    [TokenType.class, SemanticTokenTypes.class],
    [TokenType.enum, SemanticTokenTypes.enum],
    [TokenType.interface, SemanticTokenTypes.interface],
    [TokenType.namespace, SemanticTokenTypes.namespace],
    [TokenType.typeParameter, SemanticTokenTypes.typeParameter],
    [TokenType.type, SemanticTokenTypes.type],
    [TokenType.parameter, SemanticTokenTypes.parameter],
    [TokenType.variable, SemanticTokenTypes.variable],
    [TokenType.enumMember, SemanticTokenTypes.enumMember],
    [TokenType.property, SemanticTokenTypes.property],
    [TokenType.function, SemanticTokenTypes.function],

    // member is renamed to method in vscode codebase to match LSP default
    [TokenType.member, SemanticTokenTypes.method]
  ] as const).forEach(([tokenType, legend]) => (tokenTypes[tokenType] = legend));

  return {
    tokenModifiers,
    tokenTypes
  };
}

export function getTokenTypeFromClassification(tsClassification: number): number {
  return (tsClassification >> TokenEncodingConsts.typeOffset) - 1;
}

export function getTokenModifierFromClassification(tsClassification: number) {
  return tsClassification & TokenEncodingConsts.modifierMask;
}

const enum TokenEncodingConsts {
  typeOffset = 8,
  modifierMask = (1 << typeOffset) - 1
}

export function addCompositionApiRefTokens(
  tsModule: RuntimeLibrary['typescript'],
  program: ts.Program,
  fileFsPath: string,
  exists: SemanticTokenOffsetData[],
  refTokensService: RefTokensService
): [number, number][] {
  const sourceFile = program.getSourceFile(fileFsPath);

  if (!sourceFile) {
    return [];
  }

  const typeChecker = program.getTypeChecker();

  const tokens: [number, number][] = [];
  walk(sourceFile, node => {
    if (!ts.isIdentifier(node) || node.text !== 'value' || !ts.isPropertyAccessExpression(node.parent)) {
      return;
    }
    const propertyAccess = node.parent;

    let parentSymbol = typeChecker.getTypeAtLocation(propertyAccess.expression).symbol;

    if (parentSymbol.flags & tsModule.SymbolFlags.Alias) {
      parentSymbol = typeChecker.getAliasedSymbol(parentSymbol);
    }

    if (parentSymbol.name !== 'Ref') {
      return;
    }

    const start = node.getStart();
    const length = node.getWidth();
    tokens.push([start, start + length]);
    const exist = exists.find(token => token.start === start && token.length === length);
    const encodedModifier = 1 << TokenModifier.refValue;

    if (exist) {
      exist.modifierSet |= encodedModifier;
    } else {
      exists.push({
        classificationType: TokenType.property,
        length: node.getEnd() - node.getStart(),
        modifierSet: encodedModifier,
        start: node.getStart()
      });
    }
  });

  return tokens;
}

function walk(node: ts.Node, callback: (node: ts.Node) => void) {
  node.forEachChild(child => {
    callback(child);
    walk(child, callback);
  });
}
