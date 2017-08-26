import * as ts from 'typescript';

export interface PropInfo {
  name: string;
  doc?: string;
}

export interface ComponentInfo {
  name: string;
  props?: PropInfo[];
}

export function findComponents(service: ts.LanguageService, fileFsPath: string): ComponentInfo[] {
  const program = service.getProgram();
  const sourceFile = program.getSourceFile(fileFsPath);
  const exportStmt = sourceFile.statements.filter(st => st.kind === ts.SyntaxKind.ExportAssignment);
  if (exportStmt.length === 0) {
    return [];
  }
  // vls will create synthetic __vueEditorBridge({ ... })
  const exportCall = (exportStmt[0] as ts.ExportAssignment).expression;
  if (exportCall.kind !== ts.SyntaxKind.CallExpression) {
    return [];
  }
  const comp = (exportCall as ts.CallExpression).arguments[0];
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
  const arrayProps = getArrayProps(compType, checker);
  if (arrayProps) {
    info.props = arrayProps;
    return info;
  }
  const props = getPropertyTypeOfType(compType, 'props', checker);
  if (!props) {
    return info;
  }
  info.props = checker.getPropertiesOfType(props).map(s => {
    return {
      name: s.name,
      doc: getPropTypeDeclaration(s, checker)
    };
  });
  return info;
}

function getPropTypeDeclaration(prop: ts.Symbol, checker: ts.TypeChecker) {
  if (!prop.valueDeclaration) {
    return '';
  }
  const declaration = prop.valueDeclaration.getChildAt(2);
  if (!declaration) {
    return '';
  }
  if (declaration.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    const text: string[] = [];
    declaration.forEachChild(n => {
      text.push(n.getText());
    });
    return text.join('\n');
  }
  return declaration.getText();
}

function getArrayProps(compType: ts.Type, checker: ts.TypeChecker) {
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
    .map((e: ts.StringLiteral) => ({name: e.text}));
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

