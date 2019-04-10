import * as ts from 'typescript';
import { getLastChild, buildDocumentation, getObjectLiteralExprFromExportExpr } from './componentInfo';
import { T_TypeScript } from '../../services/dependencyService';

interface InternalChildComponent {
  name: string;
  documentation?: string;
  definition?: {
    path: string;
    start: number;
    end: number;
  };
  defaultExportExpr?: ts.Node;
}

export function getChildComponents(
  tsModule: T_TypeScript,
  defaultExportType: ts.Type,
  checker: ts.TypeChecker,
  tagCasing = 'kebab'
): InternalChildComponent[] | undefined {
  const componentsSymbol = checker.getPropertyOfType(defaultExportType, 'components');
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
        componentName = hyphenate(s.name);
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
        const definitionObjectLiteralSymbol = checker.getAliasedSymbol(objectLiteralSymbol);
        if (definitionObjectLiteralSymbol.valueDeclaration) {
          const defaultExportExpr = getLastChild(definitionObjectLiteralSymbol.valueDeclaration);
          if (!defaultExportExpr) {
            return;
          }

          result.push({
            name: componentName,
            documentation: buildDocumentation(tsModule, definitionObjectLiteralSymbol, checker),
            definition: {
              path: definitionObjectLiteralSymbol.valueDeclaration.getSourceFile().fileName,
              start: defaultExportExpr.getStart(undefined, true),
              end: defaultExportExpr.getEnd()
            },
            defaultExportExpr: getObjectLiteralExprFromExportExpr(tsModule, defaultExportExpr)
          });
        }
      }
    });

    return result;
  }
}

const hyphenateRE = /\B([A-Z])/g;
function hyphenate(word: string) {
  return word.replace(hyphenateRE, '-$1').toLowerCase();
}
