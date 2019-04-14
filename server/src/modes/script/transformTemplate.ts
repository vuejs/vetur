import * as ts from 'typescript';
import { AST } from 'vue-eslint-parser';
import { T_TypeScript } from '../../services/dependencyService';

export const renderHelperName = '__vlsRenderHelper';
export const componentHelperName = '__vlsComponentHelper';
export const iterationHelperName = '__vlsIterationHelper';
export const listenerHelperName = '__vlsListenerHelper';

/**
 * Allowed global variables in templates.
 * Borrowed from: https://github.com/vuejs/vue/blob/dev/src/core/instance/proxy.js
 */
const globalScope = (
  'Infinity,undefined,NaN,isFinite,isNaN,' +
  'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
  'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
  'require'
).split(',');

const vOnScope = ['$event', 'arguments'];

export function getTemplateTransformFunctions(ts: T_TypeScript) {
  return {
    transformTemplate,
    injectThis
  };

  /**
   * Transform template AST to TypeScript AST.
   * Note: The returned TS AST is not compatible with
   * the regular Vue render function and does not work on runtime
   * because we just need type information for the template.
   * Each TypeScript node should be set a range because
   * the compiler may clash or do incorrect type inference
   * when it has an invalid range.
   */
  function transformTemplate(program: AST.ESLintProgram, code: string): ts.Expression[] {
    const template = program.templateBody;

    if (!template) {
      return [];
    }

    return template.children.map(c => transformChild(c, code, globalScope));
  }

  /**
   * Transform an HTML to TypeScript AST.
   * It will be a call expression like Vue's $createElement.
   * e.g.
   * __vlsComponentHelper('div', { props: { title: this.foo } }, [ ...children... ]);
   */
  function transformElement(node: AST.VElement, code: string, scope: string[]): ts.Expression {
    const newScope = scope.concat(node.variables.map(v => v.id.name));
    const element = setTextRange(
      ts.createCall(ts.setTextRange(ts.createIdentifier(componentHelperName), { pos: 0, end: 0 }), undefined, [
        // Element / Component name
        ts.createLiteral(node.name),

        // Attributes / Directives
        transformAttributes(node.startTag.attributes, code, newScope),

        // Children
        ts.createArrayLiteral(node.children.map(c => transformChild(c, code, newScope)))
      ]),
      node
    );

    const vFor = node.startTag.attributes.find(isVFor);
    if (!vFor || !vFor.value || !vFor.value.expression) {
      return element;
    } else {
      // Convert v-for directive to the iteration helper
      const exp = vFor.value.expression as AST.VForExpression;

      return setTextRange(
        ts.createCall(setTextRange(ts.createIdentifier(iterationHelperName), exp.right), undefined, [
          // Iteration target
          parseExpression(exp.right, code, scope),

          // Callback
          setTextRange(
            ts.createArrowFunction(
              undefined,
              undefined,
              parseParams(exp.left, code, scope),
              undefined,
              setTextRange(ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), exp),
              element
            ),
            exp
          )
        ]),
        exp
      );
    }
  }

  interface AttributeData {
    props: ts.ObjectLiteralElementLike[];
    on: ts.ObjectLiteralElementLike[];
    directives: ts.Expression[];
  }

  function transformAttributes(
    attrs: (AST.VAttribute | AST.VDirective)[],
    code: string,
    scope: string[]
  ): ts.Expression {
    const data: AttributeData = {
      props: [],
      on: [],
      directives: []
    };

    attrs.forEach(attr => {
      // Normal attributes
      // e.g. title="title"
      if (isVAttribute(attr)) {
        const name = attr.key.name;

        // Skip style and class because there may be v-bind for the same attribute which
        // occurs duplicate property name error.
        // Since native attribute value is not JS expression, we don't have to check it.
        if (name !== 'class' && name !== 'style') {
          data.props.push(transformNativeAttribute(attr));
        }
        return;
      }

      // v-bind directives
      // e.g. :class="{ selected: foo }"
      if (isVBind(attr)) {
        data.props.push(transformVBind(attr, code, scope));
        return;
      }

      // v-on directives
      // e.g. @click="onClick"
      if (isVOn(attr)) {
        data.on.push(transformVOn(attr, code, scope));
        return;
      }

      // Skip v-for directive (handled in `transformElement`)
      if (isVFor(attr)) {
        return;
      }

      // Skip v-slot and slot-scope for now
      if (isVSlot(attr)) {
        return;
      }

      // Other directives
      const exp = transformDirective(attr, code, scope);
      if (exp) {
        data.directives.push(...exp);
      }
    });

    // Fold all AST into VNodeData-like object
    // example output:
    // {
    //   props: { class: 'title' },
    //   on: { click: __vlsListenerHelper(this, function($event) { this.onClick($event) } }
    // }
    return ts.createObjectLiteral([
      ts.createPropertyAssignment('props', ts.createObjectLiteral(data.props)),
      ts.createPropertyAssignment('on', ts.createObjectLiteral(data.on)),
      ts.createPropertyAssignment('directives', ts.createArrayLiteral(data.directives))
    ]);
  }

  function transformNativeAttribute(attr: AST.VAttribute): ts.ObjectLiteralElementLike {
    return setTextRange(
      ts.createPropertyAssignment(
        setTextRange(ts.createIdentifier(attr.key.name), attr.key),
        attr.value ? setTextRange(ts.createLiteral(attr.value.value), attr.value) : ts.createLiteral('true')
      ),
      attr
    );
  }

  function transformVBind(vBind: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    const exp =
      vBind.value && vBind.value.expression
        ? parseExpression(vBind.value.expression as AST.ESLintExpression, code, scope)
        : ts.createLiteral('true');

    return directiveToObjectElement(vBind, exp, code, scope);
  }

  function transformVOn(vOn: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    let exp: ts.Expression;
    if (vOn.value && vOn.value.expression) {
      const vOnExp = vOn.value.expression as AST.VOnExpression;
      const newScope = scope.concat(vOnScope);

      // body may be undefined
      const statements = vOnExp.body ? vOnExp.body.map(st => transformStatement(st, code, newScope)) : [];

      const first = statements[0];
      if (statements.length === 1 && isPathToIdentifier(first)) {
        // The v-on expression is simple path to a method
        // e.g. @click="onClick"
        exp = first.expression;
      } else {
        // The v-on has some complex expressions or statements.
        // Then wrap them with a function so that they can use `$event` and `arguments`.
        // e.g.
        //   @click="onClick($event, 'test')"
        //   @click="value = "foo""
        exp = setTextRange(
          ts.createCall(setTextRange(ts.createIdentifier(listenerHelperName), vOn), undefined, [
            setTextRange(ts.createThis(), vOn),
            setTextRange(
              ts.createFunctionExpression(
                undefined,
                undefined,
                undefined,
                undefined,
                [
                  setTextRange(
                    ts.createParameter(
                      undefined,
                      undefined,
                      undefined,
                      '$event',
                      undefined,
                      setTextRange(ts.createTypeReferenceNode('Event', undefined), vOn)
                    ),
                    vOn
                  )
                ],
                undefined,
                setTextRange(ts.createBlock(statements), vOn)
              ),
              vOn
            )
          ]),
          vOn
        );
      }
    } else {
      // There are no statement in v-on value
      exp = ts.createLiteral(true);
    }

    return directiveToObjectElement(vOn, exp, code, scope);
  }

  /**
   * To transform v-bind and v-on directive
   */
  function directiveToObjectElement(
    dir: AST.VDirective,
    dirExp: ts.Expression,
    code: string,
    scope: string[]
  ): ts.ObjectLiteralElementLike {
    const name = dir.key.argument;

    if (name) {
      if (name.type === 'VIdentifier') {
        // Attribute name is specified
        // e.g. v-bind:value="foo"
        return setTextRange(
          ts.createPropertyAssignment(setTextRange(ts.createIdentifier(name.name), dir.key), dirExp),
          dir
        );
      } else {
        // Attribute name is dynamic
        // e.g. v-bind:[value]="foo"

        // Empty expression is invalid. Return empty object spread.
        if (name.expression === null) {
          return setTextRange(ts.createSpreadAssignment(setTextRange(ts.createObjectLiteral(), dir)), dir);
        }

        const propertyName = setTextRange(
          ts.createComputedPropertyName(parseExpression(name.expression as AST.ESLintExpression, code, scope)),
          dir.key
        );
        return setTextRange(ts.createPropertyAssignment(propertyName, dirExp), dir);
      }
    } else {
      // Attribute name is omitted
      // e.g. v-bind="{ value: foo }"
      return setTextRange(ts.createSpreadAssignment(dirExp), dir);
    }
  }

  /**
   * Return directive expression. May include dynamic argument expression.
   */
  function transformDirective(dir: AST.VDirective, code: string, scope: string[]): ts.Expression[] {
    const res: ts.Expression[] = [];

    if (dir.key.argument && dir.key.argument.type === 'VExpressionContainer' && dir.key.argument.expression) {
      res.push(parseExpression(dir.key.argument.expression as AST.ESLintExpression, code, scope));
    }

    if (dir.value && dir.value.expression) {
      res.push(parseExpression(dir.value.expression as AST.ESLintExpression, code, scope));
    }

    return res;
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
        return exp ? parseExpression(exp, code, scope) : ts.createLiteral('');
      case 'VText':
        return ts.createLiteral(child.value);
    }
  }

  function transformStatement(statement: AST.ESLintStatement, code: string, scope: string[]): ts.Statement {
    if (statement.type !== 'ExpressionStatement') {
      console.error('Unexpected statement type:', statement.type);
      return ts.createStatement(ts.createLiteral('""'));
    }

    return setTextRange(ts.createStatement(parseExpression(statement.expression, code, scope)), statement);
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

    // Decrement the offset since the expression now has the open parenthesis.
    const exp = parseExpressionImpl(arrowFnStr, start - 1, scope) as ts.ArrowFunction;
    return exp.parameters;
  }

  function parseExpressionImpl(exp: string, offset: number, scope: string[]): ts.Expression {
    // Add parenthesis to deal with object literal expression
    const wrappedExp = '(' + exp + ')';
    const source = ts.createSourceFile('/tmp/parsed.ts', wrappedExp, ts.ScriptTarget.Latest);
    const statement = source.statements[0];

    if (!statement || !ts.isExpressionStatement(statement)) {
      console.error('Unexpected statement kind:', statement.kind);
      return ts.createLiteral('""');
    }

    ts.forEachChild(statement, function next(node) {
      // Decrement offset for added parenthesis
      ts.setTextRange(node, {
        pos: offset - 1 + node.pos,
        end: offset - 1 + node.end
      });
      ts.forEachChild(node, next);
    });

    const parenthesis = statement.expression as ts.ParenthesizedExpression;
    return injectThis(parenthesis.expression, scope);
  }

  function injectThis(exp: ts.Expression, scope: string[]): ts.Expression {
    let res;
    if (ts.isIdentifier(exp)) {
      if (scope.indexOf(exp.text) < 0) {
        res = ts.createPropertyAccess(ts.setTextRange(ts.createThis(), exp), exp);
      } else {
        return exp;
      }
    } else if (ts.isPropertyAccessExpression(exp)) {
      res = ts.createPropertyAccess(injectThis(exp.expression, scope), exp.name);
    } else if (ts.isElementAccessExpression(exp)) {
      res = ts.createElementAccess(
        injectThis(exp.expression, scope),
        // argumentExpression cannot be undefined in the latest TypeScript
        injectThis(exp.argumentExpression!, scope)
      );
    } else if (ts.isPrefixUnaryExpression(exp)) {
      res = ts.createPrefix(exp.operator, injectThis(exp.operand, scope));
    } else if (ts.isPostfixUnaryExpression(exp)) {
      res = ts.createPostfix(injectThis(exp.operand, scope), exp.operator);
    } else if (exp.kind === ts.SyntaxKind.TypeOfExpression) {
      // Manually check `kind` for typeof expression
      // since ts.isTypeOfExpression is not working.
      res = ts.createTypeOf(injectThis((exp as ts.TypeOfExpression).expression, scope));
    } else if (ts.isDeleteExpression(exp)) {
      res = ts.createDelete(injectThis(exp.expression, scope));
    } else if (ts.isVoidExpression(exp)) {
      res = ts.createVoid(injectThis(exp.expression, scope));
    } else if (ts.isBinaryExpression(exp)) {
      res = ts.createBinary(injectThis(exp.left, scope), exp.operatorToken, injectThis(exp.right, scope));
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
      res = ts.createParen(injectThis(exp.expression, scope));
    } else if (ts.isObjectLiteralExpression(exp)) {
      res = ts.createObjectLiteral(exp.properties.map(p => injectThisForObjectLiteralElement(p, scope)));
    } else if (ts.isArrayLiteralExpression(exp)) {
      res = ts.createArrayLiteral(exp.elements.map(e => injectThis(e, scope)));
    } else if (ts.isSpreadElement(exp)) {
      res = ts.createSpread(injectThis(exp.expression, scope));
    } else if (ts.isArrowFunction(exp) && !ts.isBlock(exp.body)) {
      res = ts.createArrowFunction(
        exp.modifiers,
        exp.typeParameters,
        exp.parameters,
        exp.type,
        exp.equalsGreaterThanToken,
        injectThis(exp.body, scope.concat(flatMap(exp.parameters, collectScope)))
      );
    } else if (ts.isTemplateExpression(exp)) {
      const injectedSpans = exp.templateSpans.map(span => {
        return ts.setTextRange(ts.createTemplateSpan(injectThis(span.expression, scope), span.literal), span);
      });

      res = ts.createTemplateExpression(exp.head, injectedSpans);
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
      const name = !ts.isComputedPropertyName(el.name)
        ? el.name
        : ts.createComputedPropertyName(injectThis(el.name.expression, scope));

      res = ts.createPropertyAssignment(ts.setTextRange(name, el.name), injectThis(el.initializer, scope));
    } else if (ts.isShorthandPropertyAssignment(el)) {
      res = ts.createPropertyAssignment(el.name, injectThis(el.name, scope));
    } else if (ts.isSpreadAssignment(el)) {
      res = ts.createSpreadAssignment(injectThis(el.expression, scope));
    } else {
      return el;
    }
    return ts.setTextRange(res, el);
  }

  /**
   * Collect newly added variable names from function parameters.
   * e.g.
   * If the function parameters look like following:
   *   (foo, { bar, baz: qux }) => { ... }
   * The output should be:
   *   ['foo', 'bar', 'qux']
   */
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

  /**
   * Return `true` if the statement is a simple path to the identifier.
   * Examples of `simple path`:
   *   foo
   *   this.foo.bar
   *   list[1]
   *   record['key']
   */
  function isPathToIdentifier(statement: ts.Statement): statement is ts.ExpressionStatement {
    if (ts.isExpressionStatement(statement)) {
      const exp = statement.expression;
      return ts.isIdentifier(exp) || ts.isPropertyAccessExpression(exp);
    } else {
      return false;
    }
  }

  function isVAttribute(node: AST.VAttribute | AST.VDirective): node is AST.VAttribute {
    return !node.directive;
  }

  function isVBind(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'bind';
  }

  function isVOn(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'on';
  }

  function isVFor(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'for';
  }

  function isVSlot(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && (node.key.name.name === 'slot' || node.key.name.name === 'slot-scope');
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
}
