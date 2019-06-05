import * as ts from 'typescript';
import { T_TypeScript } from '../dependencyService';

type NodeChanges<T extends ts.Node> = { [K in keyof T]?: T[K] | ts.Node | ts.NodeArray<ts.Node> };

/**
 * Walk all descendant expressions included root node naively. Not comprehensive walker.
 * Traversal type is post-order (LRN).
 * If some expression node is returned in predicate function, the node will be replaced.
 */
export function walkExpression(
  ts: T_TypeScript,
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
    return isUpdated ? ts.setTextRange(updated, original) : original;
  }

  function loop(node: ts.Expression, scope: ts.Identifier[]): ts.Expression {
    if (ts.isPropertyAccessExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, ts.createPropertyAccess(expression, node.name)), scope);
    }

    if (ts.isElementAccessExpression(node)) {
      const expression = loop(node.expression, scope);
      const argumentExpression = loop(node.argumentExpression, scope);
      return visit(
        update({ expression, argumentExpression }, node, ts.createElementAccess(expression, argumentExpression)),
        scope
      );
    }

    if (ts.isPrefixUnaryExpression(node)) {
      const operand = loop(node.operand, scope);
      return visit(update({ operand }, node, ts.createPrefix(node.operator, operand)), scope);
    }

    if (ts.isPostfixUnaryExpression(node)) {
      const operand = loop(node.operand, scope);
      return visit(update({ operand }, node, ts.createPostfix(operand, node.operator)), scope);
    }

    // Manually check `kind` for typeof expression
    // since ts.isTypeOfExpression is not working.
    if (node.kind === ts.SyntaxKind.TypeOfExpression) {
      const n = node as ts.TypeOfExpression;
      const expression = loop(n.expression, scope);
      return visit(update({ expression }, n, ts.createTypeOf(expression)), scope);
    }

    if (ts.isDeleteExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, ts.createDelete(expression)), scope);
    }

    if (ts.isVoidExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, ts.createVoid(expression)), scope);
    }

    if (ts.isBinaryExpression(node)) {
      const left = loop(node.left, scope);
      const right = loop(node.right, scope);
      return visit(update({ left, right }, node, ts.createBinary(left, node.operatorToken, right)), scope);
    }

    if (ts.isConditionalExpression(node)) {
      const condition = loop(node.condition, scope);
      const whenTrue = loop(node.whenTrue, scope);
      const whenFalse = loop(node.whenFalse, scope);
      return visit(
        update({ condition, whenTrue, whenFalse }, node, ts.createConditional(condition, whenTrue, whenFalse)),
        scope
      );
    }

    if (ts.isCallExpression(node)) {
      const expression = loop(node.expression, scope);
      const args = mapNodeArray(node.arguments, arg => loop(arg, scope));
      return visit(
        update({ expression, arguments: args }, node, ts.createCall(expression, node.typeArguments, args)),
        scope
      );
    }

    if (ts.isParenthesizedExpression(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, ts.createParen(expression)), scope);
    }

    if (ts.isObjectLiteralExpression(node)) {
      const properties = mapNodeArray(node.properties, p => {
        return walkObjectLiteralElementLike(p, scope);
      });
      return visit(update({ properties }, node, ts.createObjectLiteral(properties)), scope);
    }

    if (ts.isArrayLiteralExpression(node)) {
      const elements = mapNodeArray(node.elements, el => loop(el, scope));
      return visit(update({ elements }, node, ts.createArrayLiteral(elements)), scope);
    }

    if (ts.isSpreadElement(node)) {
      const expression = loop(node.expression, scope);
      return visit(update({ expression }, node, ts.createSpread(expression)), scope);
    }

    if (ts.isArrowFunction(node)) {
      const fnScope = scope.concat(flatMap(node.parameters, collectScope));
      let body: ts.ConciseBody;
      if (ts.isBlock(node.body)) {
        const statements = mapNodeArray(node.body.statements, st => {
          if (ts.isExpressionStatement(st)) {
            const expression = loop(st.expression, fnScope);
            return update({ expression }, st, ts.createExpressionStatement(expression));
          } else {
            return st;
          }
        });
        body = update({ statements }, node.body, ts.createBlock(statements));
      } else {
        body = loop(node.body, fnScope);
      }

      return visit(
        update(
          { body },
          node,
          ts.createArrowFunction(
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

    if (ts.isTemplateExpression(node)) {
      const templateSpans = mapNodeArray(node.templateSpans, span => {
        const expression = loop(span.expression, scope);
        return update({ expression }, span, ts.createTemplateSpan(expression, span.literal));
      });
      return visit(update({ templateSpans }, node, ts.createTemplateExpression(node.head, templateSpans)), scope);
    }

    if (ts.isNewExpression(node)) {
      const expression = loop(node.expression, scope);
      const args = node.arguments && mapNodeArray(node.arguments, arg => loop(arg, scope));
      return update(
        {
          expression,
          arguments: args
        },
        node,
        ts.createNew(expression, node.typeArguments, args)
      );
    }

    return visit(node, scope);
  }

  function walkObjectLiteralElementLike(
    node: ts.ObjectLiteralElementLike,
    scope: ts.Identifier[]
  ): ts.ObjectLiteralElementLike {
    if (ts.isPropertyAssignment(node)) {
      let name: ts.PropertyName;
      if (ts.isComputedPropertyName(node.name)) {
        const expression = loop(node.name.expression, scope);
        name = update({ expression }, node.name, ts.createComputedPropertyName(expression));
      } else {
        name = node.name;
      }
      const initializer = loop(node.initializer, scope);
      return update({ name, initializer }, node, ts.createPropertyAssignment(name, initializer));
    }

    if (ts.isSpreadAssignment(node)) {
      const expression = loop(node.expression, scope);
      return update({ expression }, node, ts.createSpreadAssignment(expression));
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
function collectScope(param: ts.ParameterDeclaration | ts.BindingElement): ts.Identifier[] {
  const binding = param.name;
  if (ts.isIdentifier(binding)) {
    return [binding];
  } else if (ts.isObjectBindingPattern(binding)) {
    return flatMap(binding.elements, collectScope);
  } else if (ts.isArrayBindingPattern(binding)) {
    const filtered = binding.elements.filter(ts.isBindingElement);
    return flatMap(filtered, collectScope);
  } else {
    return [];
  }
}

/**
 * Map node array to the same item type. If all item references are not changed, it returns the input list.
 */
function mapNodeArray<T extends ts.Node>(list: ts.NodeArray<T>, fn: (value: T) => T): ts.NodeArray<T> {
  const mapped = list.map(fn);
  const isUpdated = mapped.some((v, i) => {
    const old = list[i];
    return v !== old;
  });
  return isUpdated ? ts.createNodeArray(mapped) : list;
}

function flatMap<T extends ts.Node, R>(list: ReadonlyArray<T>, fn: (value: T) => R[]): R[] {
  return list.reduce<R[]>((acc, item) => {
    return acc.concat(fn(item));
  }, []);
}
