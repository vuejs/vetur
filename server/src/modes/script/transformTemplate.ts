import * as ts from 'typescript';
import { AST } from 'vue-eslint-parser';

export const componentHelperName = '__veturComponentHelper';

/**
 * Transform template AST to TypeScript AST.
 * Note: The returned TS AST is not compatible with
 * the regular Vue render function and does not work on runtime
 * because we just need type information for the template.
 */
export function transformTemplate(program: AST.ESLintProgram, code: string): ts.Expression[] {
  const template = program.templateBody;

  if (!template) {
    return [];
  }

  return template.children.map(c => transformChild(c, code));
}

function transformElement(node: AST.VElement, code: string): ts.Expression {
  return setTextRange(ts.createCall(
    ts.setTextRange(ts.createIdentifier(componentHelperName), { pos: 0, end: 0 }),
    undefined,
    [
      // Element / Component name
      ts.createLiteral(node.name),

      // Attributes / Directives
      transformAttributes(node.startTag.attributes, code),

      // Children
      ts.createArrayLiteral(node.children.map(c => transformChild(c, code)))
    ]
  ), node);
}

function transformAttributes(attrs: (AST.VAttribute | AST.VDirective)[], code: string): ts.Expression {
  const literalProps = attrs.filter(isVAttribute).map(attr => {
    return setTextRange(ts.createPropertyAssignment(
      setTextRange(ts.createIdentifier(attr.key.name), attr.key),
      attr.value
        ? setTextRange(ts.createLiteral(attr.value.value), attr.value)
        : ts.createLiteral('true')
    ), attr);
  });


  const boundProps = attrs.filter(isVBind).map(attr => {
    const name = attr.key.argument;
    const exp = (attr.value && attr.value.expression)
      ? parseExpression(attr.value.expression as AST.ESLintExpression, code)
      : ts.createLiteral('true');

    if (name) {
      return setTextRange(ts.createPropertyAssignment(
        setTextRange(ts.createIdentifier(name), attr.key),
        exp
      ), attr);
    } else {
      return setTextRange(ts.createSpreadAssignment(exp), attr);
    }
  });


  const listeners = attrs.filter(isVOn).map(attr => {
    const name = attr.key.argument;

    let statements: ts.Statement[] = [];
    if (attr.value && attr.value.expression) {
      const exp = attr.value.expression as AST.VOnExpression;
      statements = exp.body.map(st => transformStatement(st, code));
    }

    if (statements.length === 1) {
      const first = statements[0];

      if (
        ts.isExpressionStatement(first) &&
        ts.isIdentifier(first.expression)
      ) {
        statements[0] = ts.setTextRange(ts.createStatement(
          ts.setTextRange(ts.createCall(
            first.expression,
            undefined,
            [ts.setTextRange(ts.createIdentifier('$event'), first)]
          ), first)
        ), first);
      }
    }

    const exp = ts.createFunctionExpression(undefined, undefined, undefined, undefined,
      [ts.createParameter(undefined, undefined, undefined,
        '$event',
        undefined,
        ts.createTypeReferenceNode('Event', undefined)
      )],
      undefined,
      ts.createBlock(statements)
    );

    if (name) {
      return setTextRange(ts.createPropertyAssignment(
        setTextRange(ts.createIdentifier(name), attr.key),
        exp
      ), attr);
    } else {
      return setTextRange(ts.createSpreadAssignment(exp), attr);
    }
  });

  return ts.createObjectLiteral([
    ts.createPropertyAssignment('props', ts.createObjectLiteral(
      [...literalProps, ...boundProps]
    )),
    ts.createPropertyAssignment('on', ts.createObjectLiteral(listeners))
  ]);
}

function transformChild(child: AST.VElement | AST.VExpressionContainer | AST.VText, code: string): ts.Expression {
  switch (child.type) {
    case 'VElement':
      return transformElement(child, code);
    case 'VExpressionContainer':
      // Never appear v-for / v-on expression here
      const exp = child.expression as AST.ESLintExpression | null;
      return exp ? parseExpression(exp, code) : ts.createLiteral('""');
    case 'VText':
      return ts.createLiteral(child.value);
  }
}

function transformStatement(statement: AST.ESLintStatement, code: string): ts.Statement {
  if (statement.type !== 'ExpressionStatement') {
    console.error('Unexpected statement type:', statement.type);
    return ts.createStatement(ts.createLiteral('""'));
  }

  return setTextRange(ts.createStatement(
    parseExpression(statement.expression, code)
  ), statement);
}

function parseExpression(expression: AST.ESLintExpression, code: string): ts.Expression {
  const [start, end] = expression.range;
  const expStr = code.slice(start, end);
  const source = ts.createSourceFile('/tmp/parsed.ts', expStr, ts.ScriptTarget.Latest);
  const statement = source.statements[0];

  if (!statement || !ts.isExpressionStatement(statement)) {
    console.error('Unexpected statement kind:', statement.kind);
    return ts.createLiteral('""');
  }

  ts.forEachChild(statement, function next(node) {
    ts.setTextRange(node, {
      pos: start + node.pos,
      end: start + node.end
    });
    ts.forEachChild(node, next);
  });

  return injectThisForIdentifier(statement.expression, []);
}

function injectThisForIdentifier(expression: ts.Expression, scope: ts.Identifier[]): ts.Expression {
  let res;
  switch (expression.kind) {
    case ts.SyntaxKind.Identifier:
      res = ts.createPropertyAccess(
        ts.setTextRange(ts.createThis(), expression),
        expression as ts.Identifier
      );
      break;
    default:
      return expression;
  }
  return ts.setTextRange(res, expression);
}

function isVAttribute(node: AST.VAttribute | AST.VDirective): node is AST.VAttribute {
  return !node.directive;
}

function isVBind(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
  return node.directive && node.key.name === 'bind';
}

function isVOn(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
  return node.directive && node.key.name === 'on';
}

function setTextRange<T extends ts.TextRange>(range: T, location: AST.HasLocation): T {
  return ts.setTextRange(range, {
    pos: location.range[0],
    end: location.range[1]
  });
}
