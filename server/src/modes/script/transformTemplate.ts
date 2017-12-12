import * as ts from 'typescript';
import { HTMLDocument, Node, Attribute, Directive, Expression, Range } from '../template/parser/htmlParser';

export const componentHelperName = '__veturComponentHelper';

/**
 * Transform template AST to TypeScript AST.
 * Note: The returned TS AST is not compatible with
 * the regular Vue render function and does not work on runtime
 * because we just need type information for the template.
 */
export function transformTemplate(html: HTMLDocument): ts.Expression[] {
  const template = html.roots.find(node => {
    return node.tag === 'template';
  });
  return template ? template.children.map(transformNode) : [];
}

function transformNode(node: Node): ts.Expression {
  return setTextRange(ts.createCall(
    ts.setTextRange(ts.createIdentifier(componentHelperName), { pos: 0, end: 0 }),
    undefined,
    [
      // Element / Component name
      ts.createLiteral(JSON.stringify(node.tag)),

      // Attributes / Directives
      transformAttributes(node.attributes, node.directives),

      // Children
      transformChildren(node.children)
    ]
  ), node);
}

function transformAttributes(
  attributes: Record<string, Attribute> | undefined,
  directives: Record<string, Directive[]> | undefined
): ts.Expression {
  const literalProps = !attributes ? [] : Object.keys(attributes).map(key => {
    const attr = attributes[key];
    return setTextRange(ts.createPropertyAssignment(
      setTextRange(ts.createIdentifier(attr.name.text), attr.name),
      attr.value
        ? setTextRange(ts.createLiteral(JSON.stringify(attr.value.text)), attr.value)
        : ts.createLiteral('true')
    ), attr);
  });


  const boundProps = (!directives || !directives['v-bind']) ? [] : directives['v-bind'].map(bind => {
    const name = bind.key.argument;
    const exp = bind.value ? parseExpression(bind.value) : ts.createLiteral('true');

    if (name) {
      return setTextRange(ts.createPropertyAssignment(
        setTextRange(ts.createIdentifier(name), bind.key),
        exp
      ), bind);
    } else {
      return setTextRange(ts.createSpreadAssignment(exp), bind);
    }
  });


  const listeners = (!directives || !directives['v-on']) ? [] : directives['v-on'].map(listener => {
    const name = listener.key.argument;
    let exp = listener.value ? parseExpression(listener.value) : ts.createLiteral('true');

    if (exp.kind === ts.SyntaxKind.CallExpression) {
      exp = ts.createFunctionExpression(undefined, undefined, undefined, undefined,
        [ts.createParameter(undefined, undefined, undefined,
          '$event',
          undefined,
          ts.createTypeReferenceNode('Event', undefined)
        )],
        undefined,
        ts.createBlock([
          ts.createReturn(exp)
        ])
      );
    }

    if (name) {
      return setTextRange(ts.createPropertyAssignment(
        setTextRange(ts.createIdentifier(name), listener.key),
        exp
      ), listener);
    } else {
      return setTextRange(ts.createSpreadAssignment(exp), listener);
    }
  });

  return ts.createObjectLiteral([
    ts.createPropertyAssignment('props', ts.createObjectLiteral(
      [...literalProps, ...boundProps]
    )),
    ts.createPropertyAssignment('on', ts.createObjectLiteral(listeners))
  ]);
}

function transformChildren(children: Node[]): ts.Expression {
  return ts.createArrayLiteral(children.map(transformNode));
}

function parseExpression(expression: Expression): ts.Expression {
  const source = ts.createSourceFile('/tmp/parsed.ts', expression.expression, ts.ScriptTarget.Latest);
  const statement = source.statements[0];

  if (statement.kind !== ts.SyntaxKind.ExpressionStatement) {
    console.error('Unexpected statement kind:', statement.kind);
    return ts.createLiteral('""');
  }

  ts.forEachChild(statement, function next(node) {
    ts.setTextRange(node, {
      pos: expression.start + node.pos,
      end: expression.start + node.end
    });
    ts.forEachChild(node, next);
  });

  return injectThisForIdentifier((statement as ts.ExpressionStatement).expression, []);
}

function injectThisForIdentifier(expression: ts.Expression, scope: ts.Identifier[]): ts.Expression {
  switch (expression.kind) {
    case ts.SyntaxKind.Identifier:
      return ts.createPropertyAccess(ts.createThis(), expression as ts.Identifier);
    default:
      return expression;
  }
}

function setTextRange<T extends ts.TextRange>(range: T, location: Range): T {
  return ts.setTextRange(range, {
    pos: location.start,
    end: location.end
  });
}
