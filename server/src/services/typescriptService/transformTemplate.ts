import * as ts from 'typescript';
import { AST } from 'vue-eslint-parser';
import { T_TypeScript } from '../dependencyService';

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

type ESLintVChild = AST.VElement | AST.VExpressionContainer | AST.VText;

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
  function transformTemplate(program: AST.ESLintProgram, code: string) {
    const template = program.templateBody;

    if (!template) {
      return [];
    }

    return transformChildren(template.children, code, globalScope);
  }

  /**
   * Transform an HTML to TypeScript AST.
   * It will be a call expression like Vue's $createElement.
   * e.g.
   * __vlsComponentHelper('div', { props: { title: this.foo } }, [ ...children... ]);
   */
  function transformElement(node: AST.VElement, code: string, scope: string[]): ts.Expression {
    return ts.createCall(ts.createIdentifier(componentHelperName), undefined, [
      // Element / Component name
      ts.createLiteral(node.name),

      // Attributes / Directives
      transformAttributes(node.startTag.attributes, code, scope),

      // Children
      ts.createArrayLiteral(transformChildren(node.children, code, scope))
    ]);
  }

  function transformAttributes(
    attrs: (AST.VAttribute | AST.VDirective)[],
    code: string,
    scope: string[]
  ): ts.Expression {
    interface AttributeData {
      props: ts.ObjectLiteralElementLike[];
      on: ts.ObjectLiteralElementLike[];
      directives: ts.Expression[];
    }

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

      // Skip v-slot, v-for and v-if family directive (handled in `transformChildren`)
      if (isVSlot(attr) || isVFor(attr) || isVIf(attr) || isVElseIf(attr) || isVElse(attr)) {
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
    return ts.createPropertyAssignment(
      ts.createStringLiteral(attr.key.name),
      attr.value ? ts.createLiteral(attr.value.value) : ts.createLiteral(true)
    );
  }

  function transformVBind(vBind: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    let exp: ts.Expression;
    if (!vBind.value || !vBind.value.expression) {
      exp = ts.createLiteral(true);
    } else {
      const value = vBind.value.expression as AST.ESLintExpression | AST.VFilterSequenceExpression;
      if (value.type === 'VFilterSequenceExpression') {
        exp = transformFilter(value, code, scope);
      } else {
        exp = parseExpression(value, code, scope);
      }
    }

    return directiveToObjectElement(vBind, exp, code, scope);
  }

  function transformVOn(vOn: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    let exp: ts.Expression;
    if (vOn.value && vOn.value.expression) {
      // value.expression can be ESLintExpression (e.g. ArrowFunctionExpression)
      const vOnExp = vOn.value.expression as AST.VOnExpression | AST.ESLintExpression;

      if (vOnExp.type !== 'VOnExpression') {
        // The v-on value is an expression of simple path to a method or a function
        // e.g.
        //   @click="onClick"
        //   @click="() => value = 123"
        exp = parseExpression(vOnExp, code, scope);
      } else {
        // The v-on has some complex expressions or statements.
        // Then wrap them with a function so that they can use `$event` and `arguments`.
        // e.g.
        //   @click="onClick($event, 'test')"
        //   @click="value = "foo""
        const newScope = scope.concat(vOnScope);
        exp = ts.createCall(ts.createIdentifier(listenerHelperName), undefined, [
          ts.createThis(),
          ts.createFunctionExpression(
            undefined,
            undefined,
            undefined,
            undefined,
            [
              ts.createParameter(
                undefined,
                undefined,
                undefined,
                '$event',
                undefined,
                ts.createTypeReferenceNode('Event', undefined)
              )
            ],
            undefined,
            ts.createBlock(vOnExp.body.map(st => transformStatement(st, code, newScope)))
          )
        ]);
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
        return ts.createPropertyAssignment(ts.createStringLiteral(name.name), dirExp);
      } else {
        // Attribute name is dynamic
        // e.g. v-bind:[value]="foo"

        // Empty expression is invalid. Return empty object spread.
        if (name.expression === null) {
          return ts.createSpreadAssignment(ts.createObjectLiteral());
        }

        const propertyName = ts.createComputedPropertyName(
          parseExpression(name.expression as AST.ESLintExpression, code, scope)
        );
        return ts.createPropertyAssignment(propertyName, dirExp);
      }
    } else {
      // Attribute name is omitted
      // e.g. v-bind="{ value: foo }"
      return ts.createSpreadAssignment(dirExp);
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

  function transformChildren(children: ESLintVChild[], code: string, originalScope: string[]): ts.Expression[] {
    type ChildData = VIfFamilyData | VForData | VSlotData | NodeData;

    /**
     * For v-if, v-else-if and v-else
     */
    interface VIfFamilyData {
      type: 'v-if-family';
      data: ChildData;
      directive: AST.VDirective;
      next?: VIfFamilyData;
    }

    interface VForData {
      type: 'v-for';
      data: ChildData;
      vFor: AST.VDirective;
      scope: string[];
    }

    interface VSlotData {
      type: 'v-slot';
      data: ChildData;
      vSlot: AST.VDirective;
      scope: string[];
    }

    interface NodeData {
      type: 'node';
      data: ESLintVChild;
    }

    // Pre-transform child nodes to make further transformation easier
    function preTransform(children: ESLintVChild[]): ChildData[] {
      const queue = children.slice();

      function element(el: AST.VElement, attrs: (AST.VAttribute | AST.VDirective)[]): ChildData {
        const vSlot = attrs.find(isVSlot);
        if (vSlot) {
          const index = attrs.indexOf(vSlot);
          const scope = el.variables.filter(v => v.kind === 'scope').map(v => v.id.name);

          return {
            type: 'v-slot',
            vSlot,
            data: element(el, [...attrs.slice(0, index), ...attrs.slice(index + 1)]),
            scope
          };
        }

        // v-for has higher priority than v-if
        // https://vuejs.org/v2/guide/list.html#v-for-with-v-if
        const vFor = attrs.find(isVFor);
        if (vFor) {
          const index = attrs.indexOf(vFor);
          const scope = el.variables.filter(v => v.kind === 'v-for').map(v => v.id.name);

          return {
            type: 'v-for',
            vFor,
            data: element(el, [...attrs.slice(0, index), ...attrs.slice(index + 1)]),
            scope
          };
        }

        const vIf = attrs.find(isVIf);
        if (vIf) {
          const index = attrs.indexOf(vIf);
          return {
            type: 'v-if-family',
            directive: vIf,
            data: element(el, [...attrs.slice(0, index), ...attrs.slice(index + 1)]),
            next: followVIf()
          };
        }

        return {
          type: 'node',
          data: el
        };
      }

      function followVIf(): VIfFamilyData | undefined {
        const el = queue[0];
        if (!el || el.type !== 'VElement') {
          return undefined;
        }

        const attrs = el.startTag.attributes;
        const directive = attrs.find(isVElseIf) || attrs.find(isVElse);

        if (!directive) {
          return undefined;
        }

        queue.shift();
        return {
          type: 'v-if-family',
          directive,
          data: element(el, attrs),
          next: followVIf()
        };
      }

      function loop(acc: ChildData[]): ChildData[] {
        const target = queue.shift();
        if (!target) {
          return acc;
        }

        if (target.type !== 'VElement') {
          return loop(
            acc.concat({
              type: 'node',
              data: target
            })
          );
        }

        return loop(acc.concat(element(target, target.startTag.attributes)));
      }

      return loop([]);
    }

    function mainTransform(children: ChildData[]): ts.Expression[] {
      function genericTransform(child: ChildData, scope: string[]): ts.Expression {
        switch (child.type) {
          case 'v-for':
            return vForTransform(child, scope);
          case 'v-if-family':
            return vIfFamilyTransform(child, scope);
          case 'v-slot':
            return vSlotTransform(child, scope);
          case 'node':
            return nodeTransform(child, scope);
        }
      }

      function vIfFamilyTransform(vIfFamily: VIfFamilyData, scope: string[]): ts.Expression {
        const dir = vIfFamily.directive;
        const exp = dir.value && (dir.value.expression as AST.ESLintExpression | null);

        const condition = exp ? parseExpression(exp, code, scope) : ts.createLiteral(true);
        const next = vIfFamily.next ? vIfFamilyTransform(vIfFamily.next, scope) : ts.createLiteral(true);

        return ts.createConditional(
          // v-if or v-else-if condition
          condition,

          // element that the v-if family directive belongs to
          genericTransform(vIfFamily.data, scope),

          // next sibling element of v-if or v-else if any
          next
        );
      }

      function vForTransform(vForData: VForData, scope: string[]): ts.Expression {
        const vFor = vForData.vFor;
        if (!vFor.value || !vFor.value.expression) {
          return genericTransform(vForData.data, scope);
        }

        // Convert v-for directive to the iteration helper
        const exp = vFor.value.expression as AST.VForExpression;
        const newScope = scope.concat(vForData.scope);

        return ts.createCall(ts.createIdentifier(iterationHelperName), undefined, [
          // Iteration target
          parseExpression(exp.right, code, scope),

          // Callback

          ts.createArrowFunction(
            undefined,
            undefined,
            parseParams(exp.left, code, scope),
            undefined,
            ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            genericTransform(vForData.data, newScope)
          )
        ]);
      }

      function vSlotTransform(vSlotData: VSlotData, scope: string[]): ts.Expression {
        const vSlot = vSlotData.vSlot;
        if (!vSlot.value || !vSlot.value.expression) {
          return genericTransform(vSlotData.data, scope);
        }

        const exp = vSlot.value.expression as AST.VSlotScopeExpression;
        const newScope = scope.concat(vSlotData.scope);

        return ts.createArrowFunction(
          undefined,
          undefined,
          parseParams(exp.params, code, scope),
          undefined,
          ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          genericTransform(vSlotData.data, newScope)
        );
      }

      function nodeTransform(nodeData: NodeData, scope: string[]): ts.Expression {
        const child = nodeData.data;
        switch (child.type) {
          case 'VElement':
            return transformElement(child, code, scope);
          case 'VExpressionContainer': {
            const exp = child.expression as AST.ESLintExpression | AST.VFilterSequenceExpression | null;
            if (!exp) {
              return ts.createLiteral('');
            }

            if (exp.type === 'VFilterSequenceExpression') {
              return transformFilter(exp, code, scope);
            }

            return parseExpression(exp, code, scope);
          }
          case 'VText':
            return ts.createLiteral(child.value);
        }
      }

      return children.map(child => genericTransform(child, originalScope));
    }

    // Remove whitespace nodes
    const filtered = children.filter(child => {
      return child.type !== 'VText' || child.value.trim() !== '';
    });

    return mainTransform(preTransform(filtered));
  }

  function transformStatement(statement: AST.ESLintStatement, code: string, scope: string[]): ts.Statement {
    if (statement.type !== 'ExpressionStatement') {
      console.error('Unexpected statement type:', statement.type);
      return ts.createStatement(ts.createLiteral(''));
    }

    return ts.createStatement(parseExpression(statement.expression, code, scope));
  }

  function transformFilter(filter: AST.VFilterSequenceExpression, code: string, scope: string[]): ts.Expression {
    const exp = parseExpression(filter.expression, code, scope);

    // Simply convert all filter arguments into array literal because
    // we just want to check their types.
    // Do not care about existence of filters and matching between parameter
    // and argument types because filters will not appear on component type.
    const filterExps = ts.createArrayLiteral(
      filter.filters.map(f => {
        return ts.createArrayLiteral(
          f.arguments.map(arg => {
            const exp = arg.type === 'SpreadElement' ? arg.argument : arg;
            return parseExpression(exp, code, scope);
          })
        );
      })
    );

    return ts.createBinary(filterExps, ts.SyntaxKind.BarBarToken, exp);
  }

  function parseExpression(expression: AST.ESLintExpression, code: string, scope: string[]): ts.Expression {
    const [start, end] = expression.range;
    const expStr = code.slice(start, end);

    const tsExp = parseExpressionImpl(expStr, scope, start);
    if (!ts.isObjectLiteralExpression(tsExp)) {
      ts.setSourceMapRange(tsExp, { pos: start, end });
    }
    return tsExp;
  }

  function parseExpressionImpl(exp: string, scope: string[], start: number): ts.Expression {
    // Add parenthesis to deal with object literal expression
    const wrappedExp = '(' + exp + ')';
    const source = ts.createSourceFile('/tmp/parsed.ts', wrappedExp, ts.ScriptTarget.Latest, true);
    const statement = source.statements[0];

    if (!statement || !ts.isExpressionStatement(statement)) {
      console.error('Unexpected statement kind:', statement.kind);
      return ts.createLiteral('');
    }

    const parenthesis = statement.expression as ts.ParenthesizedExpression;
    return injectThis(
      parenthesis.expression,
      scope,
      // Compensate for the added `(` that adds 1 to each Node's offset
      start - '('.length
    );
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
    const exp = parseExpressionImpl(arrowFnStr, scope, start - 1) as ts.ArrowFunction;
    return exp.parameters;
  }

  function injectThis(exp: ts.Expression, scope: string[], start: number): ts.Expression {
    let res;
    if (ts.isIdentifier(exp)) {
      if (scope.indexOf(exp.text) < 0) {
        res = ts.createPropertyAccess(ts.createThis(), exp);
      } else {
        return exp;
      }
    } else if (ts.isPropertyAccessExpression(exp)) {
      res = ts.createPropertyAccess(injectThis(exp.expression, scope, start), exp.name);
    } else if (ts.isElementAccessExpression(exp)) {
      res = ts.createElementAccess(
        injectThis(exp.expression, scope, start),
        // argumentExpression cannot be undefined in the latest TypeScript
        injectThis(exp.argumentExpression!, scope, start)
      );
    } else if (ts.isPrefixUnaryExpression(exp)) {
      res = ts.createPrefix(exp.operator, injectThis(exp.operand, scope, start));
    } else if (ts.isPostfixUnaryExpression(exp)) {
      res = ts.createPostfix(injectThis(exp.operand, scope, start), exp.operator);
    } else if (exp.kind === ts.SyntaxKind.TypeOfExpression) {
      // Manually check `kind` for typeof expression
      // since ts.isTypeOfExpression is not working.
      res = ts.createTypeOf(injectThis((exp as ts.TypeOfExpression).expression, scope, start));
    } else if (ts.isDeleteExpression(exp)) {
      res = ts.createDelete(injectThis(exp.expression, scope, start));
    } else if (ts.isVoidExpression(exp)) {
      res = ts.createVoid(injectThis(exp.expression, scope, start));
    } else if (ts.isBinaryExpression(exp)) {
      res = ts.createBinary(injectThis(exp.left, scope, start), exp.operatorToken, injectThis(exp.right, scope, start));
    } else if (ts.isConditionalExpression(exp)) {
      res = ts.createConditional(
        injectThis(exp.condition, scope, start),
        injectThis(exp.whenTrue, scope, start),
        injectThis(exp.whenFalse, scope, start)
      );
    } else if (ts.isCallExpression(exp)) {
      res = ts.createCall(
        injectThis(exp.expression, scope, start),
        exp.typeArguments,
        exp.arguments.map(arg => injectThis(arg, scope, start))
      );
    } else if (ts.isParenthesizedExpression(exp)) {
      res = ts.createParen(injectThis(exp.expression, scope, start));
    } else if (ts.isObjectLiteralExpression(exp)) {
      res = ts.createObjectLiteral(exp.properties.map(p => injectThisForObjectLiteralElement(p, scope, start)));
    } else if (ts.isArrayLiteralExpression(exp)) {
      res = ts.createArrayLiteral(exp.elements.map(e => injectThis(e, scope, start)));
    } else if (ts.isSpreadElement(exp)) {
      res = ts.createSpread(injectThis(exp.expression, scope, start));
    } else if (ts.isArrowFunction(exp) && !ts.isBlock(exp.body)) {
      res = ts.createArrowFunction(
        exp.modifiers,
        exp.typeParameters,
        exp.parameters,
        exp.type,
        exp.equalsGreaterThanToken,
        injectThis(exp.body, scope.concat(flatMap(exp.parameters, collectScope)), start)
      );
    } else if (ts.isTemplateExpression(exp)) {
      const injectedSpans = exp.templateSpans.map(span => {
        const literal = ts.isTemplateMiddle(span.literal)
          ? ts.createTemplateMiddle(span.literal.text)
          : ts.createTemplateTail(span.literal.text);

        return ts.createTemplateSpan(injectThis(span.expression, scope, start), literal);
      });

      res = ts.createTemplateExpression(ts.createTemplateHead(exp.head.text), injectedSpans);
    } else {
      /**
       * Because Nodes can have non-virtual positions
       * Set them to synthetic positions so printers could print correctly
       */
      if (hasValidPos(exp)) {
        ts.setTextRange(exp, { pos: -1, end: -1 });
      }
      return exp;
    }
    return res;
  }

  function injectThisForObjectLiteralElement(
    el: ts.ObjectLiteralElementLike,
    scope: string[],
    start: number
  ): ts.ObjectLiteralElementLike {
    let res;
    if (ts.isPropertyAssignment(el)) {
      let name: ts.PropertyName;
      if (ts.isComputedPropertyName(el.name)) {
        name = ts.createComputedPropertyName(injectThis(el.name.expression, scope, start));
      } else if (ts.isStringLiteral(el.name)) {
        name = ts.createStringLiteral(el.name.text);
      } else if (ts.isNumericLiteral(el.name)) {
        name = ts.createNumericLiteral(el.name.text);
      } else {
        name = el.name;
      }

      if (!ts.isComputedPropertyName(el.name)) {
        ts.setSourceMapRange(name, { pos: start + el.name.getStart(), end: start + el.name.getEnd() });
      }

      const initializer = injectThis(el.initializer, scope, start);
      ts.setSourceMapRange(initializer, {
        pos: start + el.initializer.getStart(),
        end: start + el.initializer.getEnd()
      });
      res = ts.createPropertyAssignment(name, initializer);
    } else if (ts.isShorthandPropertyAssignment(el)) {
      const initializer = injectThis(el.name, scope, start);
      ts.setSourceMapRange(initializer, {
        pos: start + el.name.getStart(),
        end: start + el.name.getEnd()
      });
      res = ts.createPropertyAssignment(el.name, initializer);
    } else if (ts.isSpreadAssignment(el)) {
      res = ts.createSpreadAssignment(injectThis(el.expression, scope, start));
    } else {
      return el;
    }
    return res;
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

  function isVAttribute(node: AST.VAttribute | AST.VDirective): node is AST.VAttribute {
    return !node.directive;
  }

  function isVBind(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'bind';
  }

  function isVOn(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'on';
  }

  function isVIf(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'if';
  }

  function isVElseIf(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'else-if';
  }

  function isVElse(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive && node.key.name.name === 'else';
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

  function hasValidPos(node: ts.Node) {
    return node.pos !== -1 && node.end !== -1;
  }
}
