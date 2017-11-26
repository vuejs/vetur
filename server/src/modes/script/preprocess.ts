import * as ts from 'typescript';
import * as path from 'path';

import * as templateCompiler from 'vue-template-compiler';
import * as templateTranspiler from 'vue-template-es2015-compiler';

import { getDocumentRegions } from '../embeddedSupport';
import { TextDocument } from 'vscode-languageserver-types';

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
  return transformVueTemplate(template.getText());
}

function isTSLike(scriptKind: ts.ScriptKind | undefined) {
  return scriptKind === ts.ScriptKind.TS || scriptKind === ts.ScriptKind.TSX;
}

export function createUpdater() {
  const clssf = ts.createLanguageServiceSourceFile;
  const ulssf = ts.updateLanguageServiceSourceFile;

  function modifySourceFile(fileName: string, sourceFile: ts.SourceFile, scriptKind?: ts.ScriptKind): void {
    // store scriptKind info on sourceFile
    const hackSourceFile: any = sourceFile;
    hackSourceFile.__scriptKind = scriptKind;

    if (!hackSourceFile.__modified) {
      if (isVue(fileName) && !isTSLike(scriptKind)) {
        modifyVueScript(sourceFile);
      } else if (isVueTemplate(fileName)) {
        modifyRender(sourceFile);
      }
      hackSourceFile.__modified = true;
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
    modifySourceFile(fileName, sourceFile, scriptKind);
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
    modifySourceFile(sourceFile.fileName, sourceFile, scriptKind);
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
function modifyRender(sourceFile: ts.SourceFile): void {
  annotateArguments(sourceFile);

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
          setZeroPos(ts.createIdentifier('RenderHelpers')),
          setZeroPos(ts.createIdentifier('__VueRenderHelpers'))
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
  const renderElement = setRenderPos(ts.createFunctionDeclaration(undefined, undefined, undefined,
    '__render',
    undefined,
    [setZeroPos(ts.createParameter(undefined, undefined, undefined,
      'this',
      undefined,
      setZeroPos(ts.createIntersectionTypeNode([
        setZeroPos(ts.createTypeReferenceNode(
          setMinPos(ts.createIdentifier('__VueRenderHelpers')),
          undefined
        )),
        setZeroPos(ts.createTypeQueryNode(
          setMinPos(ts.createIdentifier('__component'))
        ))
      ]))
    ))],
    undefined,
    setRenderPos(ts.createBlock(sourceFile.statements))
  ));

  // 4. replace the original statements with wrapped code.
  sourceFile.statements = setRenderPos(ts.createNodeArray([
    componentImport,
    helperImport,
    component,
    renderElement
  ]));
}

/**
 * Transform Vue template block to JavaScript code
 * to analyze template expression with type information.
 */
function transformVueTemplate(template: string): string {
  const compiled = templateCompiler.compile(template);

  // TODO: handle errors
  if (compiled.errors.length > 0) {
    throw compiled.errors;
  }

  // We only need render function to type check.
  return transpileWithWrap(compiled.render);
}

/**
 * Annotate all function argument type with `any`
 * to avoid implicit any error.
 */
function annotateArguments(node: ts.Node): void {
  ts.forEachChild(node, function next(node) {
    switch (node.kind) {
      case ts.SyntaxKind.FunctionExpression:
        const fn = node as ts.FunctionExpression;
        fn.parameters.forEach(param => {
          param.type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
        });
      default:
        ts.forEachChild(node, next);
    }
  });
}

function transpileWithWrap(code: string): string {
  const pre = '(function(){';
  const post = '})()';
  return templateTranspiler(pre + code + post)
    .slice(pre.length)
    .slice(0, -post.length);
}

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(wrapped: ts.TextRange): <T extends ts.TextRange>(wrapperNode: T) => T {
  return <T extends ts.TextRange>(wrapperNode: T) => ts.setTextRange(wrapperNode, wrapped);
}
