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

  const defaultExportNode = getDefaultExportNode(tsModule, sourceFile);
  if (!defaultExportNode) {
    return undefined;
  }

  const vueFileInfo = analyzeDefaultExportExpr(tsModule, defaultExportNode, checker);

  const defaultExportType = checker.getTypeAtLocation(defaultExportNode);
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
        info: c.defaultExportNode ? analyzeDefaultExportExpr(tsModule, c.defaultExportNode, checker) : undefined
      });
    });
    vueFileInfo.componentInfo.childComponents = childComponents;
  }

  return vueFileInfo;
}

export function analyzeDefaultExportExpr(
  tsModule: T_TypeScript,
  defaultExportNode: ts.Node,
  checker: ts.TypeChecker
): VueFileInfo {
  const defaultExportType = checker.getTypeAtLocation(defaultExportNode);

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

export function getDefaultExportNode(tsModule: T_TypeScript, sourceFile: ts.SourceFile): ts.Node | undefined {
  const exportStmts = sourceFile.statements.filter(
    st => st.kind === tsModule.SyntaxKind.ExportAssignment || st.kind === tsModule.SyntaxKind.ClassDeclaration
  );
  if (exportStmts.length === 0) {
    return undefined;
  }
  const exportNode =
    exportStmts[0].kind === tsModule.SyntaxKind.ExportAssignment
      ? (exportStmts[0] as ts.ExportAssignment).expression
      : (exportStmts[0] as ts.ClassDeclaration);

  return getNodeFromExportNode(tsModule, exportNode);
}

function getProps(tsModule: T_TypeScript, defaultExportType: ts.Type, checker: ts.TypeChecker): PropInfo[] | undefined {
  const result: PropInfo[] = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassProps, getObjectProps);
  return result.length === 0 ? undefined : result;

  function getClassProps(type: ts.Type) {
    const propDecoratorNames = ['Prop', 'Model', 'PropSync'];
    const propsSymbols = type
      .getProperties()
      .filter(property =>
        getPropertyDecoratorNames(property, tsModule.SyntaxKind.PropertyDeclaration).some(decoratorName =>
          propDecoratorNames.includes(decoratorName)
        )
      );
    if (propsSymbols.length === 0) {
      return undefined;
    }

    return propsSymbols.map(propSymbol => {
      const prop = propSymbol.valueDeclaration as ts.PropertyDeclaration;
      const decoratorExpr = prop.decorators?.find(decorator =>
        tsModule.isCallExpression(decorator.expression)
          ? propDecoratorNames.includes(decorator.expression.expression.getText())
          : false
      )?.expression as ts.CallExpression;
      const decoratorName = decoratorExpr.expression.getText();
      const args = decoratorExpr.arguments;

      const firstNode = args[0];
      if (decoratorName === 'PropSync' && tsModule.isStringLiteral(firstNode)) {
        return { name: firstNode.text, documentation: buildDocumentation(tsModule, propSymbol, checker) };
      }

      return {
        name: propSymbol.name,
        documentation: buildDocumentation(tsModule, propSymbol, checker)
      };
    });
  }

  function getObjectProps(type: ts.Type) {
    const propsSymbol = checker.getPropertyOfType(type, 'props');
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
            name: (expr as ts.StringLiteral).text,
            documentation: `\`\`\`js\n${formatJSLikeDocumentation(
              propsDeclaration.parent.getFullText().trim()
            )}\n\`\`\`\n`
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
  const result: DataInfo[] = getClassAndObjectInfo(tsModule, defaultExportType, checker, getClassData, getObjectData);
  return result.length === 0 ? undefined : result;

  function getClassData(type: ts.Type) {
    const noDataDecoratorNames = ['Prop', 'Model', 'Provide', 'ProvideReactive', 'Ref'];
    const dataSymbols = type
      .getProperties()
      .filter(
        property =>
          !getPropertyDecoratorNames(property, tsModule.SyntaxKind.PropertyDeclaration).some(decoratorName =>
            noDataDecoratorNames.includes(decoratorName)
          ) &&
          !property.name.startsWith('_') &&
          !property.name.startsWith('$')
      );
    if (dataSymbols.length === 0) {
      return undefined;
    }

    return dataSymbols.map(data => {
      return {
        name: data.name,
        documentation: buildDocumentation(tsModule, data, checker)
      };
    });
  }

  function getObjectData(type: ts.Type) {
    const dataSymbol = checker.getPropertyOfType(type, 'data');
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
}

function getComputed(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker
): ComputedInfo[] | undefined {
  const result: ComputedInfo[] = getClassAndObjectInfo(
    tsModule,
    defaultExportType,
    checker,
    getClassComputed,
    getObjectComputed
  );
  return result.length === 0 ? undefined : result;

  function getClassComputed(type: ts.Type) {
    const getAccessorSymbols = type
      .getProperties()
      .filter(property => property.valueDeclaration.kind === tsModule.SyntaxKind.GetAccessor);
    const setAccessorSymbols = defaultExportType
      .getProperties()
      .filter(property => property.valueDeclaration.kind === tsModule.SyntaxKind.SetAccessor);
    if (getAccessorSymbols.length === 0) {
      return undefined;
    }

    return getAccessorSymbols.map(computed => {
      const setComputed = setAccessorSymbols.find(setAccessor => setAccessor.name === computed.name);
      return {
        name: computed.name,
        documentation:
          buildDocumentation(tsModule, computed, checker) +
          (setComputed !== undefined ? buildDocumentation(tsModule, setComputed, checker) : '')
      };
    });
  }

  function getObjectComputed(type: ts.Type) {
    const computedSymbol = checker.getPropertyOfType(type, 'computed');
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
  }
}

function isInternalHook(methodName: string) {
  const $internalHooks = [
    'data',
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeDestroy',
    'destroyed',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'render',
    'errorCaptured', // 2.5
    'serverPrefetch' // 2.6
  ];
  return $internalHooks.includes(methodName);
}

function getMethods(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker
): MethodInfo[] | undefined {
  const result: MethodInfo[] = getClassAndObjectInfo(
    tsModule,
    defaultExportType,
    checker,
    getClassMethods,
    getObjectMethods
  );
  return result.length === 0 ? undefined : result;

  function getClassMethods(type: ts.Type) {
    const methodSymbols = type
      .getProperties()
      .filter(
        property =>
          !getPropertyDecoratorNames(property, tsModule.SyntaxKind.MethodDeclaration).some(
            decoratorName => decoratorName === 'Watch'
          ) && !isInternalHook(property.name)
      );
    if (methodSymbols.length === 0) {
      return undefined;
    }

    return methodSymbols.map(method => {
      return {
        name: method.name,
        documentation: buildDocumentation(tsModule, method, checker)
      };
    });
  }

  function getObjectMethods(type: ts.Type) {
    const methodsSymbol = checker.getPropertyOfType(type, 'methods');
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
  }
}

function getNodeFromExportNode(tsModule: T_TypeScript, exportExpr: ts.Node): ts.Node | undefined {
  switch (exportExpr.kind) {
    case tsModule.SyntaxKind.CallExpression:
      // Vue.extend or synthetic __vueEditorBridge
      return (exportExpr as ts.CallExpression).arguments[0];
    case tsModule.SyntaxKind.ObjectLiteralExpression:
      return exportExpr as ts.ObjectLiteralExpression;
    case tsModule.SyntaxKind.ClassDeclaration:
      return exportExpr as ts.ClassDeclaration;
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

export function isClassType(tsModule: T_TypeScript, type: ts.Type) {
  if (type.isClass === undefined) {
    return !!(
      (type.flags & tsModule.TypeFlags.Object ? (type as ts.ObjectType).objectFlags : 0) & tsModule.ObjectFlags.Class
    );
  } else {
    return type.isClass();
  }
}

export function getClassDecoratorArgumentType(
  tsModule: T_TypeScript,
  defaultExportNode: ts.Type,
  checker: ts.TypeChecker
) {
  const decorators = defaultExportNode.symbol.valueDeclaration.decorators;
  if (!decorators || decorators.length === 0) {
    return undefined;
  }

  if (!tsModule.isCallExpression(decorators?.[0].expression)) {
    return undefined;
  }

  const decoratorArguments = decorators?.[0].expression?.arguments;
  if (!decoratorArguments || decoratorArguments.length === 0) {
    return undefined;
  }

  return checker.getTypeAtLocation(decoratorArguments[0]);
}

function getClassAndObjectInfo<C, O>(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker,
  getClassResult: (type: ts.Type) => C[] | undefined,
  getObjectResult: (type: ts.Type) => O[] | undefined
) {
  const result: Array<C | O> = [];
  if (isClassType(tsModule, defaultExportType)) {
    result.push.apply(result, getClassResult(defaultExportType) || []);
    const decoratorArgumentType = getClassDecoratorArgumentType(tsModule, defaultExportType, checker);
    if (decoratorArgumentType) {
      result.push.apply(result, getObjectResult(decoratorArgumentType) || []);
    }
  } else {
    result.push.apply(result, getObjectResult(defaultExportType) || []);
  }
  return result;
}

function getPropertyDecoratorNames(property: ts.Symbol, checkSyntaxKind: ts.SyntaxKind): string[] {
  if (property.valueDeclaration.kind !== checkSyntaxKind) {
    return [];
  }

  const decorators = property?.valueDeclaration?.decorators;
  if (decorators === undefined) {
    return [];
  }

  return decorators
    .map(decorator => decorator.expression as ts.CallExpression)
    .filter(decoratorExpression => decoratorExpression.expression !== undefined)
    .map(decoratorExpression => decoratorExpression.expression.getText());
}

export function buildDocumentation(tsModule: T_TypeScript, s: ts.Symbol, checker: ts.TypeChecker) {
  let documentation = s
    .getDocumentationComment(checker)
    .map(d => d.text)
    .join('\n');

  documentation += '\n';

  if (s.valueDeclaration) {
    documentation += `\`\`\`js\n${formatJSLikeDocumentation(s.valueDeclaration.getText())}\n\`\`\`\n`;
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
