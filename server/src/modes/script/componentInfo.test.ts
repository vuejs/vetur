import assert from 'assert';
import ts from 'typescript';
import { analyzeDefaultExportExpr, getDefaultExportNode } from './componentInfo';
import { VueVersion } from '../../utils/vueVersion';

suite('componentInfo', () => {
  test('extracts props from a component instance $props type', () => {
    const fileName = 'component.ts';
    const sourceText = `
interface ComponentProps {
  requiredText: string;
  optionalCount?: number;
}

export default class Component {
  $props!: ComponentProps;
}
`;

    const compilerOptions: ts.CompilerOptions = {
      module: ts.ModuleKind.CommonJS,
      strict: true,
      target: ts.ScriptTarget.Latest
    };
    const host = ts.createCompilerHost(compilerOptions);
    const getSourceFile = host.getSourceFile;

    host.getSourceFile = (name, languageVersion) => {
      if (name === fileName) {
        return ts.createSourceFile(name, sourceText, languageVersion, true);
      }
      return getSourceFile(name, languageVersion);
    };
    host.fileExists = name => name === fileName || ts.sys.fileExists(name);
    host.readFile = name => (name === fileName ? sourceText : ts.sys.readFile(name));

    const program = ts.createProgram([fileName], compilerOptions, host);
    const sourceFile = program.getSourceFile(fileName)!;
    const defaultExportNode = getDefaultExportNode(ts, sourceFile)!;
    const info = analyzeDefaultExportExpr(ts, defaultExportNode, program.getTypeChecker(), VueVersion.V25);

    assert.deepStrictEqual(
      info.componentInfo.props?.map(prop => ({
        name: prop.name,
        required: prop.required,
        typeString: prop.typeString
      })),
      [
        {
          name: 'requiredText',
          required: true,
          typeString: 'string'
        },
        {
          name: 'optionalCount',
          required: false,
          typeString: 'number | undefined'
        }
      ]
    );
  });
});
