import * as ts from 'typescript';
import * as path from 'path';
import { parse } from 'vue-eslint-parser';

import { getDocumentRegions } from '../embeddedSupport';
import { TextDocument } from 'vscode-languageserver-types';
import { transformTemplate, componentHelperName, iterationHelperName } from './transformTemplate';

export function isVue(filename: string): boolean {
  return path.extname(filename) === '.vue';
}

export function isVueTemplate(path: string) {
  return path.endsWith('.vue.template');
}

export function parseVueScript(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getDocumentRegions(doc);
  const script = regions.getEmbeddedDocumentByType('script');
  return script.getText() || 'export default {};';
}

export function parseVueTemplate(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getDocumentRegions(doc);
  const template = regions.getEmbeddedDocumentByType('template');

  // TODO: support other template format
  if (template.languageId !== 'vue-html') {
    return '';
  }
  return template.getText();
}

function isTSLike(scriptKind: ts.ScriptKind | undefined) {
  return scriptKind === ts.ScriptKind.TS || scriptKind === ts.ScriptKind.TSX;
}

export function createUpdater() {
  const clssf = ts.createLanguageServiceSourceFile;
  const ulssf = ts.updateLanguageServiceSourceFile;

  function modifySourceFile(
    fileName: string,
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    scriptKind?: ts.ScriptKind
  ): void {
    // store scriptKind info on sourceFile
    const hackSourceFile: any = sourceFile;
    hackSourceFile.__scriptKind = scriptKind;

    if (!hackSourceFile.__modified) {
      if (isVue(fileName) && !isTSLike(scriptKind)) {
        modifyVueScript(sourceFile);
        hackSourceFile.__modified = true;
      } else if (isVueTemplate(fileName)) {
        const code = scriptSnapshot.getText(0, scriptSnapshot.getLength());
        const program = parse(code, { sourceType: 'module' });
        const tsCode = transformTemplate(program, code);
        injectVueTemplate(sourceFile, tsCode);
        hackSourceFile.__modified = true;
      }
    }
  }

  function createLanguageServiceSourceFile(
    fileName: string,
    scriptSnapshot: ts.IScriptSnapshot,
    scriptTarget: ts.ScriptTarget,
    version: string,
    setNodeParents: boolean,
    scriptKind?: ts.ScriptKind
  ): ts.SourceFile {
    const sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
    modifySourceFile(fileName, sourceFile, scriptSnapshot, version, scriptKind);
    return sourceFile;
  }

  function updateLanguageServiceSourceFile(
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    textChangeRange: ts.TextChangeRange,
    aggressiveChecks?: boolean
  ): ts.SourceFile {
    const hackSourceFile: any = sourceFile;
    const scriptKind = hackSourceFile.__scriptKind;
    sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
    modifySourceFile(sourceFile.fileName, sourceFile, scriptSnapshot, version, scriptKind);
    return sourceFile;
  }

  return {
    createLanguageServiceSourceFile,
    updateLanguageServiceSourceFile
  };
}

function modifyVueScript(sourceFile: ts.SourceFile): void {
  const exportDefaultObject = sourceFile.statements.find(
    st =>
      st.kind === ts.SyntaxKind.ExportAssignment &&
      (st as ts.ExportAssignment).expression.kind === ts.SyntaxKind.ObjectLiteralExpression
  );
  if (exportDefaultObject) {
    // 1. add `import Vue from 'vue'
    //    (the span of the inserted statement must be (0,0) to avoid overlapping existing statements)
    const setZeroPos = getWrapperRangeSetter({ pos: 0, end: 0 });
    const vueImport = setZeroPos(
      ts.createImportDeclaration(
        undefined,
        undefined,
        setZeroPos(ts.createImportClause(ts.createIdentifier('__vueEditorBridge'), undefined as any)),
        setZeroPos(ts.createLiteral('vue-editor-bridge'))
      )
    );
    const statements: Array<ts.Statement> = sourceFile.statements as any;
    statements.unshift(vueImport);

    // 2. find the export default and wrap it in `__vueEditorBridge(...)` if it exists and is an object literal
    // (the span of the function construct call and *all* its members must be the same as the object literal it wraps)
    const objectLiteral = (exportDefaultObject as ts.ExportAssignment).expression as ts.ObjectLiteralExpression;
    const setObjPos = getWrapperRangeSetter(objectLiteral);
    const vue = ts.setTextRange(ts.createIdentifier('__vueEditorBridge'), {
      pos: objectLiteral.pos,
      end: objectLiteral.pos + 1
    });
    (exportDefaultObject as ts.ExportAssignment).expression = setObjPos(ts.createCall(vue, undefined, [objectLiteral]));
    setObjPos(((exportDefaultObject as ts.ExportAssignment).expression as ts.CallExpression).arguments!);
  }
}

/**
 * Wrap render function with component options in the script block
 * to validate its types
 */
function injectVueTemplate(sourceFile: ts.SourceFile, renderBlock: ts.Expression[]): void {
  // 1. add import statement for corresponding Vue file
  //    so that we acquire the component type from it.
  const setZeroPos = getWrapperRangeSetter({ pos: 0, end: 0 });
  const vueFilePath = './' + path.basename(sourceFile.fileName.slice(0, -9));
  const componentImport = setZeroPos(ts.createImportDeclaration(undefined,
    undefined,
    setZeroPos(ts.createImportClause(ts.createIdentifier('__Component'), undefined)),
    setZeroPos(ts.createLiteral(vueFilePath))
  ));

  // import helper type to handle Vue's private methods
  const helperImport = setZeroPos(ts.createImportDeclaration(undefined,
    undefined,
    setZeroPos(ts.createImportClause(undefined,
      setZeroPos(ts.createNamedImports([
        setZeroPos(ts.createImportSpecifier(
          undefined,
          setZeroPos(ts.createIdentifier(componentHelperName))
        )),
        setZeroPos(ts.createImportSpecifier(
          undefined,
          setZeroPos(ts.createIdentifier(iterationHelperName))
        ))
      ]))
    )),
    setZeroPos(ts.createLiteral('vue-editor-bridge'))
  ));

  // 2. add a variable declaration of the component instance
  const setMinPos = getWrapperRangeSetter({ pos: 0, end: 1 });
  const component = setZeroPos(ts.createVariableStatement(undefined, [
    setZeroPos(ts.createVariableDeclaration('__component', undefined,
      setZeroPos(ts.createNew(
        // we need set 1 or more length for identifier node to acquire a type from it.
        setMinPos(ts.createIdentifier('__Component')),
        undefined,
        undefined
      ))
    ))
  ]));

  // 3. wrap render code with a function decralation
  //    with `this` type of component.
  const setRenderPos = getWrapperRangeSetter(sourceFile);
  const statements = renderBlock.map(exp => ts.createStatement(exp));
  const renderElement = setRenderPos(ts.createFunctionDeclaration(undefined, undefined, undefined,
    '__render',
    undefined,
    [setZeroPos(ts.createParameter(undefined, undefined, undefined,
      'this',
      undefined,
      setZeroPos(setZeroPos(ts.createTypeQueryNode(
        setMinPos(ts.createIdentifier('__component'))
      )))
    ))],
    undefined,
    setRenderPos(ts.createBlock(statements))
  ));

  // 4. replace the original statements with wrapped code.
  sourceFile.statements = setRenderPos(ts.createNodeArray([
    componentImport,
    helperImport,
    component,
    renderElement
  ]));
}

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(wrapped: ts.TextRange): <T extends ts.TextRange>(wrapperNode: T) => T {
  return <T extends ts.TextRange>(wrapperNode: T) => ts.setTextRange(wrapperNode, wrapped);
}
