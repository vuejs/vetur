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

export function getChildComponents(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker,
  tagCasing = 'kebab'
): InternalChildComponent[] | undefined {
  let type = defaultExportType;
  if (isClassType(tsModule, type)) {
    // get decorator argument type when class
    const classDecoratorArgumentType = getClassDecoratorArgumentType(tsModule, defaultExportType, checker);
    if (!classDecoratorArgumentType) {
      return undefined;
    }
    type = classDecoratorArgumentType;
  }

  const componentsSymbol = checker.getPropertyOfType(type, 'components');
  if (!componentsSymbol || !componentsSymbol.valueDeclaration) {
    return undefined;
  }

  const componentsDeclaration = getLastChild(componentsSymbol.valueDeclaration);
  if (!componentsDeclaration) {
    return undefined;
  }

  if (componentsDeclaration.kind === tsModule.SyntaxKind.ObjectLiteralExpression) {
    const componentsType = checker.getTypeOfSymbolAtLocation(componentsSymbol, componentsDeclaration);

    const result: InternalChildComponent[] = [];
    checker.getPropertiesOfType(componentsType).forEach(s => {
      if (!s.valueDeclaration) {
        return;
      }

      let componentName = s.name;
      if (tagCasing === 'kebab') {
        componentName = kebabCase(s.name);
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
        const defaultExportNode = getDefaultExportNode(
          tsModule,
          sourceFile
        );
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

    return result;
  }
}
