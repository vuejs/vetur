import * as ts from 'typescript';
import {
  getLastChild,
  buildDocumentation,
  getDefaultExportNode,
  getClassDecoratorArgumentType,
  isClassType
} from './componentInfo';
import { T_TypeScript } from '../../services/dependencyService';
import { kebabCase } from 'lodash';

interface InternalChildComponent {
  name: string;
  documentation?: string;
  definition?: {
    path: string;
    start: number;
    end: number;
  };
  defaultExportNode?: ts.Node;
}

export function analyzeComponentsDefine(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker,
  tagCasing = 'kebab'
): { start: number; end: number; insertPos: number; list: InternalChildComponent[] } | undefined {
  let componentsSymbol: ts.Symbol | undefined;

  if (!isClassType(tsModule, defaultExportType)) {
    componentsSymbol = checker.getPropertyOfType(defaultExportType, 'components');
  } else {
    // get decorator argument type when class
    const classDecoratorArgumentType = getClassDecoratorArgumentType(tsModule, defaultExportType, checker);
    if (!classDecoratorArgumentType) {
      return undefined;
    }
    componentsSymbol = checker.getPropertyOfType(classDecoratorArgumentType, 'components');
  }

  if (!componentsSymbol || !componentsSymbol.valueDeclaration) {
    return undefined;
  }

  const componentsDeclaration = getLastChild(componentsSymbol.valueDeclaration);
  if (!componentsDeclaration) {
    return undefined;
  }

  if (componentsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
    const componentsType = checker.getTypeOfSymbolAtLocation(componentsSymbol, componentsDeclaration);

    let insertPos = componentsDeclaration.getStart() + 1;
    const result: InternalChildComponent[] = [];
    checker.getPropertiesOfType(componentsType).forEach((s, i, arr) => {
      if (!s.valueDeclaration) {
        return;
      }

      let componentName = s.name;
      if (tagCasing === 'kebab') {
        componentName = kebabCase(s.name);
      }

      if (i === arr.length - 1) {
        insertPos = s.valueDeclaration.getEnd();
      }

      let objectLiteralSymbol: ts.Symbol | undefined;
      if (s.valueDeclaration.kind === tsModule.SyntaxKind.PropertyAssignment) {
        objectLiteralSymbol =
          checker.getSymbolAtLocation((s.valueDeclaration as ts.PropertyAssignment).initializer) || s;
      } else if (s.valueDeclaration.kind === tsModule.SyntaxKind.ShorthandPropertyAssignment) {
        objectLiteralSymbol = checker.getShorthandAssignmentValueSymbol(s.valueDeclaration) || s;
      }

      if (!objectLiteralSymbol) {
        return;
      }

      if (objectLiteralSymbol.flags & tsModule.SymbolFlags.Alias) {
        const definitionSymbol = checker.getAliasedSymbol(objectLiteralSymbol);
        if (!definitionSymbol.valueDeclaration) {
          return;
        }

        const sourceFile = definitionSymbol.valueDeclaration.getSourceFile();
        const defaultExportNode = getDefaultExportNode(tsModule, sourceFile);
        if (!defaultExportNode) {
          return;
        }

        result.push({
          name: componentName,
          documentation: buildDocumentation(tsModule, definitionSymbol, checker),
          definition: {
            path: sourceFile.fileName,
            start: defaultExportNode.getStart(sourceFile, true),
            end: defaultExportNode.getEnd()
          },
          defaultExportNode
        });
      }
    });

    return {
      start: componentsDeclaration.getStart(),
      end: componentsDeclaration.getEnd(),
      insertPos,
      list: result
    };
  }
}
