import * as ts from 'typescript';
import { AST } from 'vue-eslint-parser';

export const componentHelperName = '__veturComponentHelper';
export const iterationHelperName = '__veturIterationHelper';

// Allowed global variables in templates.
// From: https://github.com/vuejs/vue/blob/dev/src/core/instance/proxy.js
const globalScope = (
  'Infinity,undefined,NaN,isFinite,isNaN,' +
  'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
  'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
  'require'
).split(',');

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

  return template.children.map(c => transformChild(c, code, globalScope));
}

function transformElement(node: AST.VElement, code: string, scope: string[]): ts.Expression {
  const newScope = scope.concat(node.variables.map(v => v.id.name));
  const element = setTextRange(ts.createCall(
    ts.setTextRange(ts.createIdentifier(componentHelperName), { pos: 0, end: 0 }),
    undefined,
    [
      // Element / Component name
      ts.createLiteral(node.name),

      // Attributes / Directives
      transformAttributes(node.startTag.attributes, code, newScope),

      // Children
      ts.createArrayLiteral(node.children.map(c => transformChild(c, code, newScope)))
    ]
  ), node);

  const vFor = node.startTag.attributes.find(isVFor);
  if (!vFor || !vFor.value) {
    return element;
  } else {
    // Convert v-for directive to the iteration helper
    const exp = vFor.value.expression as AST.VForExpression;

    return setTextRange(ts.createCall(
      setTextRange(ts.createIdentifier(iterationHelperName), exp.right),
      undefined,
      [
        // Iteration target
        parseExpression(exp.right, code, scope),

        // Callback
        setTextRange(ts.createArrowFunction(
          undefined,
          undefined,
          parseParams(exp.left, code, scope),
          undefined,
          setTextRange(ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), exp),
          element
        ), exp)
      ]
    ), exp);
  }
}

function transformAttributes(
  attrs: (AST.VAttribute | AST.VDirective)[],
  code: string,
  scope: string[]
): ts.Expression {
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
      ? parseExpression(attr.value.expression as AST.ESLintExpression, code, scope)
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
      statements = exp.body.map(st => transformStatement(st, code, scope));
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

function transformChild(
  child: AST.VElement | AST.VExpressionContainer | AST.VText,
  code: string,
  scope: string[]
): ts.Expression {
  switch (child.type) {
    case 'VElement':
      return transformElement(child, code, scope);
    case 'VExpressionContainer':
      // Never appear v-for / v-on expression here
      const exp = child.expression as AST.ESLintExpression | null;
      return exp ? parseExpression(exp, code, scope) : ts.createLiteral('""');
    case 'VText':
      return ts.createLiteral(child.value);
  }
}

function transformStatement(statement: AST.ESLintStatement, code: string, scope: string[]): ts.Statement {
  if (statement.type !== 'ExpressionStatement') {
    console.error('Unexpected statement type:', statement.type);
    return ts.createStatement(ts.createLiteral('""'));
  }

  return setTextRange(ts.createStatement(
    parseExpression(statement.expression, code, scope)
  ), statement);
}

function parseExpression(expression: AST.ESLintExpression, code: string, scope: string[]): ts.Expression {
  const [start, end] = expression.range;
  const expStr = code.slice(start, end);
  return parseExpressionImpl(expStr, start, scope);
}

function parseParams(
  params: AST.ESLintPattern[],
  code: string,
  scope: string[]
): ts.NodeArray<ts.ParameterDeclaration> {
  const start = params[0].range[0];
  const end = params[params.length - 1].range[1];
  const paramsStr = code.slice(start, end);
  // Wrap parameters with an arrow function to extract them as ts parameter declarations.
  const arrowFnStr = '(' + paramsStr + ') => {}';

  const exp = parseExpressionImpl(arrowFnStr, start, scope) as ts.ArrowFunction;
  return exp.parameters;
}

function parseExpressionImpl(exp: string, offset: number, scope: string[]): ts.Expression {
  const source = ts.createSourceFile('/tmp/parsed.ts', exp, ts.ScriptTarget.Latest);
  const statement = source.statements[0];

  if (!statement || !ts.isExpressionStatement(statement)) {
    console.error('Unexpected statement kind:', statement.kind);
    return ts.createLiteral('""');
  }

  ts.forEachChild(statement, function next(node) {
    ts.setTextRange(node, {
      pos: offset + node.pos,
      end: offset + node.end
    });
    ts.forEachChild(node, next);
  });

  return injectThis(statement.expression, scope);
}

export function injectThis(exp: ts.Expression, scope: string[]): ts.Expression {
  let res;
  if (ts.isIdentifier(exp)) {
    if (scope.indexOf(exp.text) < 0) {
      res = ts.createPropertyAccess(
        ts.setTextRange(ts.createThis(), exp),
        exp
      );
    } else {
      return exp;
    }
  } else if (ts.isPropertyAccessExpression(exp)) {
    res = ts.createPropertyAccess(
      injectThis(exp.expression, scope),
      exp.name
    );
  } else if (ts.isPrefixUnaryExpression(exp)) {
    res = ts.createPrefix(
      exp.operator,
      injectThis(exp.operand, scope)
    );
  } else if (ts.isPostfixUnaryExpression(exp)) {
    res = ts.createPostfix(
      injectThis(exp.operand, scope),
      exp.operator
    );
  } else if (exp.kind === ts.SyntaxKind.TypeOfExpression) {
    // Manually check `kind` for typeof expression
    // since ts.isTypeOfExpression is not working.
    res = ts.createTypeOf(
      injectThis((exp as ts.TypeOfExpression).expression, scope)
    );
  } else if (ts.isDeleteExpression(exp)) {
    res = ts.createDelete(
      injectThis(exp.expression, scope)
    );
  } else if (ts.isVoidExpression(exp)) {
    res = ts.createVoid(
      injectThis(exp.expression, scope)
    );
  } else if (ts.isBinaryExpression(exp)) {
    res = ts.createBinary(
      injectThis(exp.left, scope),
      exp.operatorToken,
      injectThis(exp.right, scope)
    );
  } else if (ts.isConditionalExpression(exp)) {
    res = ts.createConditional(
      injectThis(exp.condition, scope),
      injectThis(exp.whenTrue, scope),
      injectThis(exp.whenFalse, scope)
    );
  } else if (ts.isCallExpression(exp)) {
    res = ts.createCall(
      injectThis(exp.expression, scope),
      exp.typeArguments,
      exp.arguments.map(arg => injectThis(arg, scope))
    );
  } else if (ts.isParenthesizedExpression(exp)) {
    res = ts.createParen(
      injectThis(exp.expression, scope)
    );
  } else if (ts.isObjectLiteralExpression(exp)) {
    res = ts.createObjectLiteral(
      exp.properties.map(p => injectThisForObjectLiteralElement(p, scope))
    );
  } else if (ts.isArrowFunction(exp) && !ts.isBlock(exp.body)) {
    res = ts.createArrowFunction(
      exp.modifiers,
      exp.typeParameters,
      exp.parameters,
      exp.type,
      exp.equalsGreaterThanToken,
      injectThis(
        exp.body,
        scope.concat(flatMap(exp.parameters, collectScope))
      )
    );
  } else {
    return exp;
  }
  return ts.setTextRange(res, exp);
}

function injectThisForObjectLiteralElement(
  el: ts.ObjectLiteralElementLike,
  scope: string[]
): ts.ObjectLiteralElementLike {
  let res;
  if (ts.isPropertyAssignment(el)) {
    res = ts.createPropertyAssignment(
      el.name,
      injectThis(el.initializer, scope)
    );
  } else if (ts.isShorthandPropertyAssignment(el)) {
    res = ts.createPropertyAssignment(
      el.name,
      injectThis(el.name, scope)
    );
  } else if (ts.isSpreadAssignment(el)) {
    res = ts.createSpreadAssignment(
      injectThis(el.expression, scope)
    );
  } else {
    return el;
  }
  return ts.setTextRange(res, el);
}

function collectScope(param: ts.ParameterDeclaration | ts.BindingElement): string[] {
  const binding = param.name;
  if (ts.isIdentifier(binding)) {
    return [binding.text];
  } else if (ts.isObjectBindingPattern(binding)) {
    return flatMap(binding.elements, collectScope);
  } else if (ts.isArrayBindingPattern(binding)) {
    const filtered = binding.elements.filter(ts.isBindingElement);
    return flatMap(filtered, collectScope);
  } else {
    return [];
  }
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

function isVFor(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
  return node.directive && node.key.name === 'for';
}

function flatMap<T extends ts.Node, R>(list: ReadonlyArray<T>, fn: (value: T) => R[]): R[] {
  return list.reduce<R[]>((acc, item) => {
    return acc.concat(fn(item));
  }, []);
}

function setTextRange<T extends ts.TextRange>(range: T, location: AST.HasLocation): T {
  return ts.setTextRange(range, {
    pos: location.range[0],
    end: location.range[1]
  });
}
