import * as ts from 'typescript';
import {
  VueFileInfo,
  PropInfo,
  ComputedInfo,
  DataInfo,
  MethodInfo,
  ChildComponent
} from '../../services/vueInfoService';
import { getChildComponents } from './childComponents';

export function getComponentInfo(service: ts.LanguageService, fileFsPath: string): VueFileInfo | undefined {
  const program = service.getProgram();
  if (!program) {
    return undefined;
  }

  const sourceFile = program.getSourceFile(fileFsPath);
  if (!sourceFile) {
    return undefined;
  }

  const checker = program.getTypeChecker();

  const defaultExportExpr = getDefaultExportObjectLiteralExpr(sourceFile);
  if (!defaultExportExpr) {
    return undefined;
  }

  const vueFileInfo = analyzeDefaultExportExpr(defaultExportExpr, checker);

  const defaultExportType = checker.getTypeAtLocation(defaultExportExpr);
  const internalChildComponents = getChildComponents(defaultExportType, checker);

  if (internalChildComponents) {
    const childComponents: ChildComponent[] = [];
    internalChildComponents.forEach(c => {
      childComponents.push({
        name: c.name,
        documentation: c.documentation,
        definition: c.definition,
        info: c.defaultExportExpr ? analyzeDefaultExportExpr(c.defaultExportExpr, checker) : undefined
      });
    });
    vueFileInfo.componentInfo.childComponents = childComponents;
  }

  return vueFileInfo;
}

export function analyzeDefaultExportExpr(defaultExportExpr: ts.Node, checker: ts.TypeChecker): VueFileInfo {
  const defaultExportType = checker.getTypeAtLocation(defaultExportExpr);

  const props = getProps(defaultExportType, checker);
  const data = getData(defaultExportType, checker);
  const computed = getComputed(defaultExportType, checker);
  const methods = getMethods(defaultExportType, checker);

  return {
    componentInfo: {
      props,
      data,
      computed,
      methods
    }
  };
}

function getDefaultExportObjectLiteralExpr(sourceFile: ts.SourceFile): ts.Expression | undefined {
  const exportStmts = sourceFile.statements.filter(st => st.kind === ts.SyntaxKind.ExportAssignment);
  if (exportStmts.length === 0) {
    return undefined;
  }
  const exportExpr = (exportStmts[0] as ts.ExportAssignment).expression;

  return getObjectLiteralExprFromExportExpr(exportExpr);
}

function getProps(defaultExportType: ts.Type, checker: ts.TypeChecker): PropInfo[] | undefined {
  const propsSymbol = checker.getPropertyOfType(defaultExportType, 'props');
  if (!propsSymbol || !propsSymbol.valueDeclaration) {
    return undefined;
  }

  const propsDeclaration = getLastChild(propsSymbol.valueDeclaration);
  if (!propsDeclaration) {
    return undefined;
  }

  /**
   * Plain array props like `props: ['foo', 'bar']`
   */
  if (propsDeclaration.kind === ts.SyntaxKind.ArrayLiteralExpression) {
    return (propsDeclaration as ts.ArrayLiteralExpression).elements
      .filter(expr => expr.kind === ts.SyntaxKind.StringLiteral)
      .map(expr => {
        return {
          name: (expr as ts.StringLiteral).text
        };
      });
  }

  /**
   * Object literal props like
   * ```
   * {
   *   props: {
   *     foo: { type: Boolean, default: true },
   *     bar: { type: String, default: 'bar' }
   *   }
   * }
   * ```
   */
  if (propsDeclaration.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    const propsType = checker.getTypeOfSymbolAtLocation(propsSymbol, propsDeclaration);

    return checker.getPropertiesOfType(propsType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(s, checker)
      };
    });
  }

  return undefined;
}

/**
 * In SFC, data can only be a function
 * ```
 * {
 *   data() {
 *     return {
 *        foo: true,
 *        bar: 'bar'
 *     }
 *   }
 * }
 * ```
 */
function getData(defaultExportType: ts.Type, checker: ts.TypeChecker): DataInfo[] | undefined {
  const dataSymbol = checker.getPropertyOfType(defaultExportType, 'data');
  if (!dataSymbol || !dataSymbol.valueDeclaration) {
    return undefined;
  }

  const dataType = checker.getTypeOfSymbolAtLocation(dataSymbol, dataSymbol.valueDeclaration);
  const dataSignatures = dataType.getCallSignatures();
  if (dataSignatures.length === 0) {
    return undefined;
  }
  const dataReturnTypeProperties = checker.getReturnTypeOfSignature(dataSignatures[0]);
  return dataReturnTypeProperties.getProperties().map(s => {
    const documentation = s
      .getDocumentationComment(checker)
      .map(d => d.text)
      .join('\n');

    return {
      name: s.name,
      documentation
    };
  });
}

function getComputed(defaultExportType: ts.Type, checker: ts.TypeChecker): ComputedInfo[] | undefined {
  const computedSymbol = checker.getPropertyOfType(defaultExportType, 'computed');
  if (!computedSymbol || !computedSymbol.valueDeclaration) {
    return undefined;
  }

  const computedDeclaration = getLastChild(computedSymbol.valueDeclaration);
  if (!computedDeclaration) {
    return undefined;
  }

  if (computedDeclaration.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    const computedType = checker.getTypeOfSymbolAtLocation(computedSymbol, computedDeclaration);

    return checker.getPropertiesOfType(computedType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(s, checker)
      };
    });
  }

  return undefined;
}

function getMethods(defaultExportType: ts.Type, checker: ts.TypeChecker): MethodInfo[] | undefined {
  const methodsSymbol = checker.getPropertyOfType(defaultExportType, 'methods');
  if (!methodsSymbol || !methodsSymbol.valueDeclaration) {
    return undefined;
  }

  const methodsDeclaration = getLastChild(methodsSymbol.valueDeclaration);
  if (!methodsDeclaration) {
    return undefined;
  }

  if (methodsDeclaration.kind === ts.SyntaxKind.ObjectLiteralExpression) {
    const methodsType = checker.getTypeOfSymbolAtLocation(methodsSymbol, methodsDeclaration);

    return checker.getPropertiesOfType(methodsType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(s, checker)
      };
    });
  }

  return undefined;
}

export function getObjectLiteralExprFromExportExpr(exportExpr: ts.Node): ts.Expression | undefined {
  switch (exportExpr.kind) {
    case ts.SyntaxKind.CallExpression:
      // Vue.extend or synthetic __vueEditorBridge
      return (exportExpr as ts.CallExpression).arguments[0];
    case ts.SyntaxKind.ObjectLiteralExpression:
      return (exportExpr as ts.ObjectLiteralExpression);
  }
  return undefined;
}

export function getLastChild(d: ts.Declaration) {
  const children = d.getChildren();
  if (children.length === 0) {
    return undefined;
  }

  return children[children.length - 1];
}

export function buildDocumentation(s: ts.Symbol, checker: ts.TypeChecker) {
  const documentation = s
    .getDocumentationComment(checker)
    .map(d => d.text)
    .join('\n');
  return documentation;
}
