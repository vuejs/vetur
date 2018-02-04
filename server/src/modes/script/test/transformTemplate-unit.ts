import * as assert from 'assert';
import * as ts from 'typescript';
import { injectThis } from '../transformTemplate';

suite('transformTemplate', () => {
  suite('`this` injection', () => {
    function check(
      inputTsCode: string,
      expectedTsCode: string,
      scope: string[] = []
    ): void {
      const source = ts.createSourceFile('test.ts', inputTsCode, ts.ScriptTarget.Latest);
      const st = source.statements[0] as ts.ExpressionStatement;
      assert.equal(st.kind, ts.SyntaxKind.ExpressionStatement, 'Input ts code must be an expression');

      const exp = st.expression;
      const output = injectThis(exp, scope);

      const printer = ts.createPrinter();
      const outputStr = printer.printNode(ts.EmitHint.Expression, output, source);
      assert.equal(outputStr.trim(), expectedTsCode.trim());
    }

    test('Identifier', () => {
      check(
        'foo',
        'this.foo'
      );
    });

    test('Identifier: in scope', () => {
      check(
        'foo',
        'foo',
        ['foo']
      );
    });

    test('ThisExpression', () => {
      check(
        'this.foo',
        'this.foo'
      );
    });

    test('TypeOfExpression', () => {
      check(
        'typeof foo === "string"',
        'typeof this.foo === "string"'
      );
    });

    test('DeleteExpression', () => {
      check(
        'delete foo.bar',
        'delete this.foo.bar'
      );
    });

    test('VoidExpression', () => {
      check(
        'void foo()',
        'void this.foo()'
      );
    });

    test('PropertyAccessExpression', () => {
      check(
        'foo.bar',
        'this.foo.bar'
      );
    });

    test('PrefixUnaryExpression', () => {
      check(
        '!foo',
        '!this.foo'
      );
    });

    test('PostfixUnaryExpression', () => {
      check(
        'foo++',
        'this.foo++'
      );
    });

    test('BinaryExpression', () => {
      check(
        'foo + bar',
        'this.foo + this.bar'
      );
    });

    test('ConditionalExpression', () => {
      check(
        'foo ? bar : baz',
        'this.foo ? this.bar : this.baz'
      );
    });

    test('CallExpression', () => {
      check(
        'foo(bar)',
        'this.foo(this.bar)'
      );
    });

    test('ParenthesizedExpression', () => {
      check(
        '(foo)',
        '(this.foo)'
      );
    });

    test('ObjectLiteralExpression', () => {
      check(
        '({ foo: bar })',
        '({ foo: this.bar })'
      );
    });

    test('ObjectLiteralExpression: shorthand', () => {
      check(
        '({ foo })',
        '({ foo: this.foo })'
      );
    });

    test('ObjectLiteralExpression: spread', () => {
      check(
        '({ ...foo })',
        '({ ...this.foo })'
      );
    });

    test('ArrowFunction', () => {
      check(
        '(event) => foo(event)',
        '(event) => this.foo(event)'
      );
    });

    test('ArrowFunction: rest spread', () => {
      check(
        '(...args) => test(args)',
        '(...args) => this.test(args)'
      );
    });

    test('ArrowFunction: patterns', () => {
      check(
        '({ foo: bar, baz }, [qux, ...tail]) => tail.concat(foo(bar + baz) + qux)',
        '({ foo: bar, baz }, [qux, ...tail]) => tail.concat(this.foo(bar + baz) + qux)'
      );
    });
  });
});