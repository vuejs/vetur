import { kebabCase, snakeCase } from 'lodash';
import type ts from 'typescript';
import { AST } from 'vue-eslint-parser';
import { RuntimeLibrary } from '../dependencyService';
import { walkExpression } from './walkExpression';

export const renderHelperName = '__vlsRenderHelper';
export const componentHelperName = '__vlsComponentHelper';
export const iterationHelperName = '__vlsIterationHelper';
export const componentDataName = '__vlsComponentData';

/**
 * Allowed global variables in templates.
 * Borrowed from: https://github.com/vuejs/vue/blob/dev/src/core/instance/proxy.js
 */
export const globalScope = (
  'Infinity,undefined,NaN,isFinite,isNaN,' +
  'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
  'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
  'require'
).split(',');

const vOnScope = ['$event', 'arguments'];

type ESLintVChild = AST.VElement | AST.VExpressionContainer | AST.VText;

/**
 * @param tsModule Loaded TS dependency
 * @param childComponentNamesInSnakeCase If `VElement`'s name matches one of the child components'
 * name, generate expression with `${componentHelperName}__${name}`, which will enforce type-check
 * on props
 */
export function getTemplateTransformFunctions(
  tsModule: RuntimeLibrary['typescript'],
  childComponentNamesInSnakeCase?: string[]
) {
  return {
    transformTemplate,
    parseExpression
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
    /**
     * `vModel`      -> need info from other components to do type check
     * `v-bind`      -> do this later
     * `v-bind:[foo] -> don't do type-check. do make `[]` an interpolation area
     */
    const hasUnhandledAttributes = node.startTag.attributes.some(attr => {
      return isVModel(attr) || (isVBind(attr) && !isVBindShorthand(attr)) || isVBindWithDynamicAttributeName(attr);
    });

    const identifier =
      !hasUnhandledAttributes &&
      childComponentNamesInSnakeCase &&
      childComponentNamesInSnakeCase.indexOf(snakeCase(node.rawName)) !== -1
        ? tsModule.createIdentifier(componentHelperName + '__' + snakeCase(node.rawName))
        : tsModule.createIdentifier(componentHelperName);

    return tsModule.createCall(identifier, undefined, [
      // Pass this value to propagate ThisType in listener handlers
      tsModule.createIdentifier('this'),

      // Element / Component name
      tsModule.createLiteral(node.name),

      // Attributes / Directives
      transformAttributes(node, node.startTag.attributes, code, scope),

      // Children
      tsModule.createArrayLiteral(transformChildren(node.children, code, scope))
    ]);
  }

  function transformAttributes(
    node: AST.VElement,
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
    const propsAssignment = tsModule.createPropertyAssignment('props', tsModule.createObjectLiteral(data.props));
    tsModule.setSourceMapRange(propsAssignment.name, {
      pos: node.startTag.range[0] + '<'.length,
      end: node.startTag.range[0] + '<'.length + node.rawName.length
    });

    return tsModule.createObjectLiteral([
      propsAssignment,
      tsModule.createPropertyAssignment('on', tsModule.createObjectLiteral(data.on)),
      tsModule.createPropertyAssignment('directives', tsModule.createArrayLiteral(data.directives))
    ]);
  }

  function transformNativeAttribute(attr: AST.VAttribute): ts.ObjectLiteralElementLike {
    return tsModule.createPropertyAssignment(
      tsModule.createStringLiteral(attr.key.name),
      attr.value ? tsModule.createLiteral(attr.value.value) : tsModule.createLiteral(true)
    );
  }

  function transformVBind(vBind: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    const exp = vBind.value ? transformExpressionContainer(vBind.value, code, scope) : tsModule.createLiteral(true);
    return directiveToObjectElement(vBind, exp, code, scope);
  }

  function transformVOn(vOn: AST.VDirective, code: string, scope: string[]): ts.ObjectLiteralElementLike {
    let exp: ts.Expression;
    if (vOn.value) {
      if (!vOn.key.argument) {
        // e.g.
        //   v-on="$listeners"

        // Annotate the expression with `any` because we do not expect type error
        // with bridge type and it. Currently, bridge type should only be used
        // for inferring `$event` type.
        exp = tsModule.createAsExpression(
          transformExpressionContainer(vOn.value, code, scope),
          tsModule.createKeywordTypeNode(tsModule.SyntaxKind.AnyKeyword)
        );
      } else {
        // e.g.
        //   @click="onClick"
        //   @click="onClick($event, 'test')"

        // value.expression can be ESLintExpression (e.g. ArrowFunctionExpression)
        const vOnExp = vOn.value.expression as AST.VOnExpression | AST.ESLintExpression | null;
        const newScope = scope.concat(vOnScope);
        const statements =
          !vOnExp || vOnExp.type !== 'VOnExpression'
            ? [tsModule.createReturn(transformExpressionContainer(vOn.value, code, newScope))]
            : vOnExp.body.map(st => transformStatement(st, code, newScope));

        const createParameter = (name: string) => {
          const [major, minor] = tsModule.version.split('.');
          if ((Number(major) === 4 && Number(minor) >= 8) || Number(major) > 4) {
            // @ts-expect-error
            return tsModule.createParameter(undefined, undefined, name);
          }
          return tsModule.createParameter(undefined, undefined, undefined, name);
        };

        exp = tsModule.createFunctionExpression(
          undefined,
          undefined,
          undefined,
          undefined,
          [createParameter('$event')],
          undefined,
          tsModule.createBlock(statements)
        );
      }
    } else {
      // There are no statement in v-on value
      exp = tsModule.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        tsModule.createBlock([])
      );
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
        const fullName =
          dir.key.modifiers.length === 0 || isVBind(dir)
            ? kebabCase(name.rawName)
            : [kebabCase(name.rawName), ...dir.key.modifiers.map(m => m.rawName)].join('.');
        const propNameNode = tsModule.setSourceMapRange(tsModule.createStringLiteral(fullName), {
          pos: name.range[0],
          end: name.range[1]
        });
        return tsModule.createPropertyAssignment(propNameNode, dirExp);
      } else {
        // Attribute name is dynamic
        // e.g. v-bind:[value]="foo"
        const propertyName = tsModule.createComputedPropertyName(transformExpressionContainer(name, code, scope));
        return tsModule.createPropertyAssignment(propertyName, dirExp);
      }
    } else {
      // Attribute name is omitted
      // e.g. v-bind="{ value: foo }"
      return tsModule.createSpreadAssignment(dirExp);
    }
  }

  /**
   * Return directive expression. May include dynamic argument expression.
   */
  function transformDirective(dir: AST.VDirective, code: string, scope: string[]): ts.Expression[] {
    const res: ts.Expression[] = [];

    if (dir.key.argument && dir.key.argument.type === 'VExpressionContainer') {
      res.push(transformExpressionContainer(dir.key.argument, code, scope));
    }

    if (dir.value) {
      res.push(transformExpressionContainer(dir.value, code, scope));
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
        if (vSlot && isVDirective(vSlot)) {
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
        if (vFor && isVDirective(vFor)) {
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
        if (vIf && isVDirective(vIf)) {
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

        if (!directive || !isVDirective(directive)) {
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

        const condition = dir.value
          ? transformExpressionContainer(dir.value, code, scope)
          : tsModule.createLiteral(true);
        const next = vIfFamily.next ? vIfFamilyTransform(vIfFamily.next, scope) : tsModule.createLiteral(true);

        return tsModule.createConditional(
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

        return tsModule.createCall(tsModule.createIdentifier(iterationHelperName), undefined, [
          // Iteration target
          transformExpression(exp.right, code, scope),

          // Callback

          tsModule.createArrowFunction(
            undefined,
            undefined,
            parseParams(exp.left, code, scope),
            undefined,
            tsModule.createToken(tsModule.SyntaxKind.EqualsGreaterThanToken),
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

        return tsModule.createArrowFunction(
          undefined,
          undefined,
          parseParams(exp.params, code, scope),
          undefined,
          tsModule.createToken(tsModule.SyntaxKind.EqualsGreaterThanToken),
          genericTransform(vSlotData.data, newScope)
        );
      }

      function nodeTransform(nodeData: NodeData, scope: string[]): ts.Expression {
        const child = nodeData.data;
        switch (child.type) {
          case 'VElement':
            return transformElement(child, code, scope);
          case 'VExpressionContainer':
            return transformExpressionContainer(child, code, scope);
          case 'VText':
            return tsModule.createLiteral(child.value);
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
      return tsModule.createExpressionStatement(tsModule.createLiteral(''));
    }

    return tsModule.createExpressionStatement(transformExpression(statement.expression, code, scope));
  }

  function transformFilter(filter: AST.VFilterSequenceExpression, code: string, scope: string[]): ts.Expression {
    const exp = transformExpression(filter.expression, code, scope);

    // Simply convert all filter arguments into array literal because
    // we just want to check their types.
    // Do not care about existence of filters and matching between parameter
    // and argument types because filters will not appear on component type.
    const filterExps = tsModule.createArrayLiteral(
      filter.filters.map(f => {
        return tsModule.createArrayLiteral(
          f.arguments.map(arg => {
            const exp = arg.type === 'SpreadElement' ? arg.argument : arg;
            return transformExpression(exp, code, scope);
          })
        );
      })
    );

    return tsModule.createBinary(filterExps, tsModule.SyntaxKind.BarBarToken, exp);
  }

  function transformExpressionContainer(
    container: AST.VExpressionContainer,
    code: string,
    scope: string[]
  ): ts.Expression {
    const exp = container.expression;
    if (exp) {
      if (exp.type === 'VOnExpression' || exp.type === 'VForExpression' || exp.type === 'VSlotScopeExpression') {
        throw new Error(`'${exp.type}' should not be transformed with 'transformExpressionContainer'`);
      }

      if (exp.type === 'VFilterSequenceExpression') {
        return transformFilter(exp, code, scope);
      }
    }

    // Other type of expression should parsed by TypeScript compiler
    const [start, end] = expressionCodeRange(container);
    const expStr = code.slice(start, end);

    return parseExpression(expStr, scope, start);
  }

  function transformExpression(exp: AST.ESLintExpression, code: string, scope: string[]): ts.Expression {
    const [start, end] = exp.range;
    const expStr = code.slice(start, end);

    return parseExpression(expStr, scope, start);
  }

  function parseExpression(exp: string, scope: string[], start: number): ts.Expression {
    // Add parenthesis to deal with object literal expression
    const wrappedExp = '(' + exp + ')';
    const source = tsModule.createSourceFile('/tmp/parsed.ts', wrappedExp, tsModule.ScriptTarget.Latest, true);
    const statement = source.statements[0];

    if (!statement || !tsModule.isExpressionStatement(statement)) {
      console.error('Unexpected statement kind:', statement.kind);
      return tsModule.createLiteral('');
    }

    const parenthesis = statement.expression as ts.ParenthesizedExpression;

    // Compensate for the added `(` that adds 1 to each Node's offset
    const offset = start - '('.length;
    return walkExpression(tsModule, parenthesis.expression, createWalkCallback(scope, offset, source));
  }

  function expressionCodeRange(container: AST.VExpressionContainer): [number, number] {
    const parent = container.parent;
    const offset =
      parent.type === 'VElement' || parent.type === 'VDocumentFragment'
        ? // Text node interpolation
          // {{ exp }} => 2
          2
        : // Attribute interpolation
          // v-test:[exp] => 1
          // :name="exp" => 1
          1;

    return [container.range[0] + offset, container.range[1] - offset];
  }

  function createWalkCallback(scope: string[], offset: number, source: ts.SourceFile) {
    return (node: ts.Expression, additionalScope: ts.Identifier[]) => {
      const thisScope = scope.concat(additionalScope.map(id => id.text));

      const injected = injectThis(node, thisScope, offset, source);
      setSourceMapRange(injected, node, offset, source);
      resetTextRange(injected);
      return injected;
    };
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
    const exp = parseExpression(arrowFnStr, scope, start - 1) as ts.ArrowFunction;
    return exp.parameters;
  }

  function injectThis(exp: ts.Expression, scope: string[], start: number, source: ts.SourceFile): ts.Expression {
    if (tsModule.isIdentifier(exp)) {
      return scope.indexOf(exp.text) < 0 ? tsModule.createPropertyAccess(tsModule.createThis(), exp) : exp;
    }

    if (tsModule.isObjectLiteralExpression(exp)) {
      const properties = exp.properties.map(p => {
        if (!tsModule.isShorthandPropertyAssignment(p)) {
          return p;
        }

        // Divide short hand property to name and initializer and inject `this`
        // We need to walk generated initializer expression.
        const initializer = createWalkCallback(scope, start, source)(p.name, []);
        return tsModule.createPropertyAssignment(p.name, initializer);
      });
      return tsModule.createObjectLiteral(properties);
    }

    return exp;
  }

  function setSourceMapRange(exp: ts.Expression, range: ts.Expression, offset: number, source: ts.SourceFile): void {
    tsModule.setSourceMapRange(exp, {
      pos: offset + range.getStart(source),
      end: offset + range.getEnd()
    });

    if (tsModule.isPropertyAccessExpression(exp)) {
      // May be transformed from Identifier by injecting `this`
      const r = tsModule.isPropertyAccessExpression(range) ? range.name : range;
      tsModule.setSourceMapRange(exp.name, {
        pos: offset + r.getStart(source),
        end: offset + r.getEnd()
      });
      return;
    }

    if (tsModule.isArrowFunction(exp)) {
      const walkBinding = (name: ts.BindingName, range: ts.BindingName) => {
        tsModule.setSourceMapRange(name, {
          pos: offset + range.getStart(source),
          end: offset + range.getEnd()
        });

        if (tsModule.isObjectBindingPattern(name) || tsModule.isArrayBindingPattern(name)) {
          name.elements.forEach((el, i) => {
            if (tsModule.isOmittedExpression(el)) {
              return;
            }
            const elRange = (range as typeof name).elements[i] as typeof el;

            tsModule.setSourceMapRange(el, {
              pos: offset + elRange.getStart(source),
              end: offset + elRange.getEnd()
            });

            walkBinding(el.name, elRange.name);
          });
        }
      };

      const r = range as ts.ArrowFunction;
      exp.parameters.forEach((p, i) => {
        const range = r.parameters[i];
        tsModule.setSourceMapRange(p, {
          pos: offset + range.getStart(source),
          end: offset + range.getEnd()
        });

        walkBinding(p.name, range.name);
      });
    }
  }

  /**
   * Because Nodes can have non-virtual positions
   * Set them to synthetic positions so printers could print correctly
   */
  function resetTextRange(exp: ts.Expression): void {
    if (tsModule.isObjectLiteralExpression(exp)) {
      exp.properties.forEach((p, i) => {
        if (tsModule.isPropertyAssignment(p) && !tsModule.isComputedPropertyName(p.name)) {
          tsModule.setTextRange(p.name, {
            pos: -1,
            end: -1
          });
        }
      });
    }

    if (tsModule.isTemplateExpression(exp)) {
      tsModule.setTextRange(exp.head, { pos: -1, end: -1 });
      exp.templateSpans.forEach(span => {
        tsModule.setTextRange(span.literal, {
          pos: -1,
          end: -1
        });
      });
    }

    tsModule.setTextRange(exp, { pos: -1, end: -1 });
  }

  function isVAttribute(node: AST.VAttribute | AST.VDirective): node is AST.VAttribute {
    return !node.directive;
  }

  function isVDirective(node: AST.VAttribute | AST.VDirective): node is AST.VDirective {
    return node.directive;
  }

  function isVModel(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'model';
  }

  function isVBind(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'bind';
  }

  function isVBindShorthand(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'bind' && node.key.name.rawName === ':';
  }

  function isVBindWithDynamicAttributeName(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.argument?.type === 'VExpressionContainer';
  }

  function isVOn(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'on';
  }

  function isVIf(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'if';
  }

  function isVElseIf(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'else-if';
  }

  function isVElse(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'else';
  }

  function isVFor(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && node.key.name.name === 'for';
  }

  function isVSlot(node: AST.VAttribute | AST.VDirective): boolean {
    return node.directive && (node.key.name.name === 'slot' || node.key.name.name === 'slot-scope');
  }
}
