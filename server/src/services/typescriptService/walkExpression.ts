import type ts from 'typescript';
import { RuntimeLibrary } from '../dependencyService';

type NodeChanges<T extends ts.Node> = { [K in keyof T]?: T[K] | ts.Node | ts.NodeArray<ts.Node> };

/**
 * Walk all descendant expressions included root node naively. Not comprehensive walker.
 * Traversal type is post-order (LRN).
 * If some expression node is returned in predicate function, the node will be replaced.
 */
export function walkExpression(
  tsModule: RuntimeLibrary['typescript'],
  root: ts.Expression,
  predicate: (node: ts.Expression, additionalScope: ts.Identifier[]) => ts.Expression | void
): ts.Expression {
  function visit(node: ts.Expression, scope: ts.Identifier[]): ts.Expression {
    return predicate(node, scope) || node;
  }

  function update<T extends ts.Node>(changes: NodeChanges<T>, original: T, updated: T): T {
    const changedKeys = Object.keys(changes) as Array<keyof T>;
    const isUpdated = changedKeys.reduce((acc, key) => {
      return acc || changes[key] !== original[key];
    }, false);
    return isUpdated ? tsModule.setTextRange(updated, original) : original;
  }

  function loop(node: ts.Expression, scope: ts.Identifier[]): ts.Expression {
    if (tsModule.isPropertyAccessChain(node)) {
      const expression = loop(node.expression, scope);
      return visit(
        update({ expression }, node, tsModule.createPropertyAccessChain(expression, node.questionDotToken, node.name)),
        scope
      );
    }

    if (tsModule.isPropertyAccessExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, tsModule.createPropertyAccess(expression, node.name)), scope);
    }

    if (tsModule.isElementAccessExpression(node)) {
      const expression = loop(node.expression, scope);
      const argumentExpression = loop(node.argumentExpression, scope);
      return visit(
        update({ expression, argumentExpression }, node, tsModule.createElementAccess(expression, argumentExpression)),
        scope
      );
    }

    if (tsModule.isPrefixUnaryExpression(node)) {
      const operand = loop(node.operand, scope);
      return visit(update({ operand }, node, tsModule.createPrefix(node.operator, operand)), scope);
    }

    if (tsModule.isPostfixUnaryExpression(node)) {
      const operand = loop(node.operand, scope);
      return visit(update({ operand }, node, tsModule.createPostfix(operand, node.operator)), scope);
    }

    // Manually check `kind` for typeof expression
    // since ts.isTypeOfExpression is not working.
    if (node.kind === tsModule.SyntaxKind.TypeOfExpression) {
      const n = node as ts.TypeOfExpression;
      const expression = loop(n.expression, scope);
      return visit(update({ expression }, n, tsModule.createTypeOf(expression)), scope);
    }

    if (tsModule.isDeleteExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, tsModule.createDelete(expression)), scope);
    }

    if (tsModule.isVoidExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, tsModule.createVoid(expression)), scope);
    }

    if (tsModule.isBinaryExpression(node)) {
      const left = loop(node.left, scope);
      const right = loop(node.right, scope);
      return visit(update({ left, right }, node, tsModule.createBinary(left, node.operatorToken, right)), scope);
    }

    if (tsModule.isConditionalExpression(node)) {
      const condition = loop(node.condition, scope);
      const whenTrue = loop(node.whenTrue, scope);
      const whenFalse = loop(node.whenFalse, scope);
      return visit(
        update({ condition, whenTrue, whenFalse }, node, tsModule.createConditional(condition, whenTrue, whenFalse)),
        scope
      );
    }

    if (tsModule.isCallExpression(node)) {
      const expression = loop(node.expression, scope);
      const args = mapNodeArray(tsModule, node.arguments, arg => loop(arg, scope));
      return visit(
        update({ expression, arguments: args }, node, tsModule.createCall(expression, node.typeArguments, args)),
        scope
      );
    }

    if (tsModule.isParenthesizedExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, tsModule.createParen(expression)), scope);
    }

    if (tsModule.isObjectLiteralExpression(node)) {
      const properties = mapNodeArray(tsModule, node.properties, p => {
        return walkObjectLiteralElementLike(p, scope);
      });
      return visit(update({ properties }, node, tsModule.createObjectLiteral(properties)), scope);
    }

    if (tsModule.isArrayLiteralExpression(node)) {
      const elements = mapNodeArray(tsModule, node.elements, el => loop(el, scope));
      return visit(update({ elements }, node, tsModule.createArrayLiteral(elements)), scope);
    }

    if (tsModule.isSpreadElement(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, tsModule.createSpread(expression)), scope);
    }

    if (tsModule.isArrowFunction(node)) {
      const fnScope = scope.concat(flatMap(node.parameters, value => collectScope(tsModule, value)));
      let body: ts.ConciseBody;
      if (tsModule.isBlock(node.body)) {
        const statements = mapNodeArray(tsModule, node.body.statements, st => {
          if (tsModule.isExpressionStatement(st)) {
            const expression = loop(st.expression, fnScope);
            return update({ expression }, st, tsModule.createExpressionStatement(expression));
          } else {
            return st;
          }
        });
        body = update({ statements }, node.body, tsModule.createBlock(statements));
      } else {
        body = loop(node.body, fnScope);
      }

      return visit(
        update(
          { body },
          node,
          tsModule.createArrowFunction(
            node.modifiers,
            node.typeParameters,
            node.parameters,
            node.type,
            node.equalsGreaterThanToken,
            body
          )
        ),
        scope
      );
    }

    if (tsModule.isTemplateExpression(node)) {
      const templateSpans = mapNodeArray(tsModule, node.templateSpans, span => {
        const expression = loop(span.expression, scope);
        return update({ expression }, span, tsModule.createTemplateSpan(expression, span.literal));
      });
      return visit(update({ templateSpans }, node, tsModule.createTemplateExpression(node.head, templateSpans)), scope);
    }

    if (tsModule.isNewExpression(node)) {
      const expression = loop(node.expression, scope);
      const args = node.arguments && mapNodeArray(tsModule, node.arguments, arg => loop(arg, scope));
      return update(
        {
          expression,
          arguments: args
        },
        node,
        tsModule.createNew(expression, node.typeArguments, args)
      );
    }

    return visit(node, scope);
  }

  function walkObjectLiteralElementLike(
    node: ts.ObjectLiteralElementLike,
    scope: ts.Identifier[]
  ): ts.ObjectLiteralElementLike {
    if (tsModule.isPropertyAssignment(node)) {
      let name: ts.PropertyName;
      if (tsModule.isComputedPropertyName(node.name)) {
        const expression = loop(node.name.expression, scope);
        name = update({ expression }, node.name, tsModule.createComputedPropertyName(expression));
      } else {
        name = node.name;
      }
      const initializer = loop(node.initializer, scope);
      return update({ name, initializer }, node, tsModule.createPropertyAssignment(name, initializer));
    }

    if (tsModule.isSpreadAssignment(node)) {
      const expression = loop(node.expression, scope);
      return update({ expression }, node, tsModule.createSpreadAssignment(expression));
    }

    return node;
  }

  return loop(root, []);
}

/**
 * Collect newly added variable names from function parameters.
 * e.g.
 * If the function parameters look like following:
 *   (foo, { bar, baz: qux }) => { ... }
 * The output should be:
 *   ['foo', 'bar', 'qux']
 */
function collectScope(
  tsModule: RuntimeLibrary['typescript'],
  param: ts.ParameterDeclaration | ts.BindingElement
): ts.Identifier[] {
  const binding = param.name;
  if (tsModule.isIdentifier(binding)) {
    return [binding];
  } else if (tsModule.isObjectBindingPattern(binding)) {
    return flatMap(binding.elements, value => collectScope(tsModule, value));
  } else if (tsModule.isArrayBindingPattern(binding)) {
    const filtered = binding.elements.filter(tsModule.isBindingElement);
    return flatMap(filtered, value => collectScope(tsModule, value));
  } else {
    return [];
  }
}

/**
 * Map node array to the same item type. If all item references are not changed, it returns the input list.
 */
function mapNodeArray<T extends ts.Node>(
  tsModule: RuntimeLibrary['typescript'],
  list: ts.NodeArray<T>,
  fn: (value: T) => T
): ts.NodeArray<T> {
  const mapped = list.map(fn);
  const isUpdated = mapped.some((v, i) => {
    const old = list[i];
    return v !== old;
  });
  return isUpdated ? tsModule.createNodeArray(mapped) : list;
}

function flatMap<T extends ts.Node, R>(list: ReadonlyArray<T>, fn: (value: T) => R[]): R[] {
  return list.reduce<R[]>((acc, item) => {
    return acc.concat(fn(item));
  }, []);
}
