import * as ts from 'typescript';

export interface ComponentInfo {
  name: string;
  props?: string[];
}

export function findComponents(service: ts.LanguageService, fileFsPath: string) {
  const program = service.getProgram();
  const sourceFile = program.getSourceFile(fileFsPath);
  const importStmt = sourceFile.statements.filter(st => st.kind === ts.SyntaxKind.ExportAssignment);
  if (importStmt.length === 0) {
    return [];
  }
  const maybeComp = (importStmt[0] as ts.ExportAssignment).expression;
  if (maybeComp.kind !== ts.SyntaxKind.CallExpression) {
    return [];
  }
  const instance = maybeComp as ts.CallExpression;
  const comp = instance.arguments[0];
  const checker = program.getTypeChecker();
  const compType = checker.getTypeAtLocation(comp);
  const childComps = getPropertyTypeOfType(compType, 'components', checker);
  if (!childComps) {
    return [];
  }
  return checker.getPropertiesOfType(childComps).map(s => getCompInfo(s, checker));
}

function getCompInfo(symbol: ts.Symbol, checker: ts.TypeChecker) {
  const compType = getSymbolType(symbol, checker);
  const info: ComponentInfo = {
    name: symbol.name
  };
  if (!compType) {
    return info;
  }
  const propArray = getArrayProp(compType, checker);
  if (propArray) {
    info.props = propArray;
    return info;
  }
  const props = getPropertyTypeOfType(compType, 'props', checker);
  if (!props) {
    return info;
  }
  info.props = checker.getPropertiesOfType(props).map(s => s.name);
  return info;
}

function getArrayProp(compType: ts.Type, checker: ts.TypeChecker) {
  const propSymbol = checker.getPropertyOfType(compType, 'props');
  if (!propSymbol || !propSymbol.valueDeclaration) {
    return undefined;
  }
  const propDef = propSymbol.valueDeclaration.getChildAt(2);
  if (!propDef || propDef.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return undefined;
  }
  const propArray = propDef as ts.ArrayLiteralExpression;
  return propArray.elements
    .filter(e => e.kind === ts.SyntaxKind.StringLiteral)
    .map((e: ts.StringLiteral) => e.text);
}

function getPropertyTypeOfType(tpe: ts.Type, property: string, checker: ts.TypeChecker) {
  const propSymbol = checker.getPropertyOfType(tpe, property);
  return getSymbolType(propSymbol, checker);
}

function getSymbolType(symbol: ts.Symbol | undefined, checker: ts.TypeChecker) {
  if (!symbol || !symbol.valueDeclaration) {
    return undefined;
  }
  return checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
}

