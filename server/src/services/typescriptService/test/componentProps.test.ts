import assert from 'assert';
import ts from 'typescript';
import { analyzeDefaultExportExpr, getDefaultExportNode } from '../../../modes/script/componentInfo';
import { VueVersion } from '../../../utils/vueVersion';

function analyze(code: string) {
  const fileName = '/typed-component.ts';
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const host = ts.createCompilerHost({ noLib: true });
  host.getSourceFile = name => (name === fileName ? sourceFile : undefined);
  const program = ts.createProgram([fileName], { noLib: true }, host);
  const checker = program.getTypeChecker();
  const node = getDefaultExportNode(ts, sourceFile, checker)!;
  return { node, props: analyzeDefaultExportExpr(ts, node, checker, VueVersion.V30).componentInfo.props };
}

suite('Typed component props', () => {
  test('uses the exported class, not a preceding props helper class', () => {
    const result = analyze(`
      interface Payload { id: number }
      class Props { payload!: Payload; optional?: string }
      export default class Child {
        readonly $props!: Props;
        internalState = 1;
      }
    `);
    assert.equal((result.node as ts.ClassDeclaration).name!.text, 'Child');
    assert.deepEqual(
      result.props!.map(p => [p.name, p.required, p.typeSource]),
      [
        ['payload', true, '$props'],
        ['optional', false, '$props']
      ]
    );
    assert.equal(result.props![0].typeString, 'Payload');
  });

  test('finds private and inherited prop types through a named default export', () => {
    const result = analyze(`
      interface ParentProps { requiredValue: number }
      interface Props extends ParentProps { optional?: string }
      declare function define<P>(options: {}): new () => { $props: P };
      const Child = define<Props>({});
      export default (Child);
    `);
    assert.deepEqual(result.props!.map(p => [p.name, p.required, p.typeSource]).sort(), [
      ['optional', false, '$props'],
      ['requiredValue', true, '$props']
    ]);
  });

  test('keeps legacy metadata when a component has no constructor', () => {
    const result = analyze(`export default { props: { title: { type: String, required: true } } };`);
    assert.equal(result.props![0].name, 'title');
    assert.equal(result.props![0].required, true);
    assert.equal(result.props![0].typeString, 'string');
    assert.equal(result.props![0].typeSource, undefined);
  });

  test('does not infer arbitrary state as props when $props is untyped', () => {
    const result = analyze(`export default class Child { $props: any; internalState = 1; }`);
    assert.equal(result.props, undefined);
  });
});
