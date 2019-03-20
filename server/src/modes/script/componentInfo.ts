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
import { T_TypeScript } from '../../services/dependencyService';

export function getComponentInfo(
  tsModule: T_TypeScript,
  service: ts.LanguageService,
  fileFsPath: string,
  config: any
): VueFileInfo | undefined {
  const program = service.getProgram();
  if (!program) {
    return undefined;
  }

  const sourceFile = program.getSourceFile(fileFsPath);
  if (!sourceFile) {
    return undefined;
  }

  const checker = program.getTypeChecker();

  const defaultExportExpr = getDefaultExportObjectLiteralExpr(tsModule, sourceFile);
  if (!defaultExportExpr) {
    return undefined;
  }

  const vueFileInfo = analyzeDefaultExportExpr(tsModule, defaultExportExpr, checker);

  const defaultExportType = checker.getTypeAtLocation(defaultExportExpr);
  const internalChildComponents = getChildComponents(
    tsModule,
    defaultExportType,
    checker,
    config.vetur.completion.tagCasing
  );

  if (internalChildComponents) {
    const childComponents: ChildComponent[] = [];
    internalChildComponents.forEach(c => {
      childComponents.push({
        name: c.name,
        documentation: c.documentation,
        definition: c.definition,
        info: c.defaultExportExpr ? analyzeDefaultExportExpr(tsModule, c.defaultExportExpr, checker) : undefined
      });
    });
    vueFileInfo.componentInfo.childComponents = childComponents;
  }

  return vueFileInfo;
}

export function analyzeDefaultExportExpr(
  tsModule: T_TypeScript,
  defaultExportExpr: ts.Node,
  checker: ts.TypeChecker
): VueFileInfo {
  const defaultExportType = checker.getTypeAtLocation(defaultExportExpr);

  const props = getProps(tsModule, defaultExportType, checker);
  const data = getData(tsModule, defaultExportType, checker);
  const computed = getComputed(tsModule, defaultExportType, checker);
  const methods = getMethods(tsModule, defaultExportType, checker);

  return {
    componentInfo: {
      props,
      data,
      computed,
      methods
    }
  };
}

function getDefaultExportObjectLiteralExpr(
  tsModule: T_TypeScript,
  sourceFile: ts.SourceFile
): ts.Expression | undefined {
  const exportStmts = sourceFile.statements.filter(st => st.kind === tsModule.SyntaxKind.ExportAssignment);
  if (exportStmts.length === 0) {
    return undefined;
  }
  const exportExpr = (exportStmts[0] as ts.ExportAssignment).expression;

  return getObjectLiteralExprFromExportExpr(tsModule, exportExpr);
}

function getProps(tsModule: T_TypeScript, defaultExportType: ts.Type, checker: ts.TypeChecker): PropInfo[] | undefined {
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
  if (propsDeclaration.kind === tsModule.SyntaxKind.ArrayLiteralExpression) {
    return (propsDeclaration as ts.ArrayLiteralExpression).elements
      .filter(expr => expr.kind === tsModule.SyntaxKind.StringLiteral)
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
  if (propsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
    const propsType = checker.getTypeOfSymbolAtLocation(propsSymbol, propsDeclaration);

    return checker.getPropertiesOfType(propsType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(tsModule, s, checker)
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
function getData(tsModule: T_TypeScript, defaultExportType: ts.Type, checker: ts.TypeChecker): DataInfo[] | undefined {
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
    return {
      name: s.name,
      documentation: buildDocumentation(tsModule, s, checker)
    };
  });
}

function getComputed(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker
): ComputedInfo[] | undefined {
  const computedSymbol = checker.getPropertyOfType(defaultExportType, 'computed');
  if (!computedSymbol || !computedSymbol.valueDeclaration) {
    return undefined;
  }

  const computedDeclaration = getLastChild(computedSymbol.valueDeclaration);
  if (!computedDeclaration) {
    return undefined;
  }

  if (computedDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
    const computedType = checker.getTypeOfSymbolAtLocation(computedSymbol, computedDeclaration);

    return checker.getPropertiesOfType(computedType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(tsModule, s, checker)
      };
    });
  }

  return undefined;
}

function getMethods(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker
): MethodInfo[] | undefined {
  const methodsSymbol = checker.getPropertyOfType(defaultExportType, 'methods');
  if (!methodsSymbol || !methodsSymbol.valueDeclaration) {
    return undefined;
  }

  const methodsDeclaration = getLastChild(methodsSymbol.valueDeclaration);
  if (!methodsDeclaration) {
    return undefined;
  }

  if (methodsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
    const methodsType = checker.getTypeOfSymbolAtLocation(methodsSymbol, methodsDeclaration);

    return checker.getPropertiesOfType(methodsType).map(s => {
      return {
        name: s.name,
        documentation: buildDocumentation(tsModule, s, checker)
      };
    });
  }

  return undefined;
}

export function getObjectLiteralExprFromExportExpr(
  tsModule: T_TypeScript,
  exportExpr: ts.Node
): ts.Expression | undefined {
  switch (exportExpr.kind) {
    case tsModule.SyntaxKind.CallExpression:
      // Vue.extend or synthetic __vueEditorBridge
      return (exportExpr as ts.CallExpression).arguments[0];
    case tsModule.SyntaxKind.ObjectLiteralExpression:
      return exportExpr as ts.ObjectLiteralExpression;
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

export function buildDocumentation(tsModule: T_TypeScript, s: ts.Symbol, checker: ts.TypeChecker) {
  let documentation = s
    .getDocumentationComment(checker)
    .map(d => d.text)
    .join('\n');

  documentation += '\n';

  if (s.valueDeclaration) {
    if (s.valueDeclaration.kind === tsModule.SyntaxKind.PropertyAssignment) {
      documentation += `\`\`\`js\n${formatJSLikeDocumentation(s.valueDeclaration.getText())}\n\`\`\`\n`;
    } else {
      documentation += `\`\`\`js\n${formatJSLikeDocumentation(s.valueDeclaration.getText())}\n\`\`\`\n`;
    }
  }
  return documentation;
}

function formatJSLikeDocumentation(src: string): string {
  const segments = src.split('\n');
  if (segments.length === 1) {
    return src;
  }

  const spacesToDeindent = segments[segments.length - 1].search(/\S/);

  return (
    segments[0] +
    '\n' +
    segments
      .slice(1)
      .map(s => s.slice(spacesToDeindent))
      .join('\n')
  );
}
