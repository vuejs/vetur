import * as ts from 'typescript';
import * as path from 'path';
import { parse } from 'vue-eslint-parser';

import Uri from 'vscode-uri';
import { getVueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { TextDocument } from 'vscode-languageserver-types';
import { T_TypeScript } from '../../services/dependencyService';
import {
  getTemplateTransformFunctions,
  componentHelperName,
  iterationHelperName,
  renderHelperName
} from './transformTemplate';
import { templateSourceMap } from './serviceHost';
import { generateSourceMap } from './sourceMap';
import { isVirtualVueTemplateFile, isVueFile } from './util';

export function parseVueScript(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  const script = regions.getSingleTypeDocument('script');
  return script.getText() || 'export default {};';
}

function parseVueScriptSrc(text: string): string | undefined {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  return regions.getImportedScripts()[0];
}

export function parseVueTemplate(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  const template = regions.getSingleTypeDocument('template');

  if (template.languageId !== 'vue-html') {
    return '';
  }
  const rawText = template.getText();
  // skip checking on empty template
  if (rawText.replace(/\s/g, '') === '') {
    return '';
  }
  return rawText.replace(/ {10}/, '<template>') + '</template>';
}

export function createUpdater(tsModule: T_TypeScript) {
  const clssf = tsModule.createLanguageServiceSourceFile;
  const ulssf = tsModule.updateLanguageServiceSourceFile;
  const scriptKindTracker = new WeakMap<ts.SourceFile, ts.ScriptKind | undefined>();
  const modificationTracker = new WeakSet<ts.SourceFile>();
  const printer = tsModule.createPrinter();

  function isTSLike(scriptKind: ts.ScriptKind | undefined) {
    return scriptKind === tsModule.ScriptKind.TS || scriptKind === tsModule.ScriptKind.TSX;
  }

  function modifySourceFile(
    fileName: string,
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    scriptKind?: ts.ScriptKind
  ): void {
    if (modificationTracker.has(sourceFile)) {
      return;
    }

    if (isVueFile(fileName) && !isTSLike(scriptKind)) {
      modifyVueScript(tsModule, sourceFile);
      modificationTracker.add(sourceFile);
      return;
    }
  }

  /**
   * The transformed TS AST has synthetic nodes so language features would fail on them
   * Use printer to print the AST as re-parse the source to get a valid SourceFile
   */
  function recreateVueTempalteSourceFile(
    vueTemplateFileName: string,
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot
  ) {
    // TODO: share the logic of transforming the code into AST
    // with the template mode
    const vueText = scriptSnapshot.getText(0, scriptSnapshot.getLength());
    const templateCode = parseVueTemplate(vueText);
    const scriptSrc = parseVueScriptSrc(vueText);
    const program = parse(templateCode, { sourceType: 'module' });

    let expressions: ts.Expression[] = [];
    try {
      expressions = getTemplateTransformFunctions(tsModule).transformTemplate(program, templateCode);
      injectVueTemplate(tsModule, sourceFile, expressions, scriptSrc);
    } catch (err) {
      console.log(`Failed to transform template of ${vueTemplateFileName}`);
      console.log(err);
    }

    const newText = printer.printFile(sourceFile);

    const newSourceFile = tsModule.createSourceFile(
      vueTemplateFileName,
      newText,
      sourceFile.languageVersion,
      true /* setParentNodes: Need this to walk the AST */,
      tsModule.ScriptKind.JS
    );

    const templateFsPath = Uri.file(vueTemplateFileName).fsPath;
    const sourceMapNodes = generateSourceMap(tsModule, sourceFile, newSourceFile);
    templateSourceMap[templateFsPath] = sourceMapNodes;
    templateSourceMap[templateFsPath.slice(0, -'.template'.length)] = sourceMapNodes;

    return newSourceFile;
  }

  function createLanguageServiceSourceFile(
    fileName: string,
    scriptSnapshot: ts.IScriptSnapshot,
    scriptTarget: ts.ScriptTarget,
    version: string,
    setNodeParents: boolean,
    scriptKind?: ts.ScriptKind
  ): ts.SourceFile {
    let sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
    scriptKindTracker.set(sourceFile, scriptKind);
    if (isVirtualVueTemplateFile(fileName)) {
      sourceFile = recreateVueTempalteSourceFile(fileName, sourceFile, scriptSnapshot);
      modificationTracker.add(sourceFile);
    } else {
      modifySourceFile(fileName, sourceFile, scriptSnapshot, version, scriptKind);
    }
    return sourceFile;
  }

  function updateLanguageServiceSourceFile(
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    textChangeRange: ts.TextChangeRange,
    aggressiveChecks?: boolean
  ): ts.SourceFile {
    const scriptKind = scriptKindTracker.get(sourceFile);
    sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
    if (isVirtualVueTemplateFile(sourceFile.fileName)) {
      sourceFile = recreateVueTempalteSourceFile(sourceFile.fileName, sourceFile, scriptSnapshot);
      modificationTracker.add(sourceFile);
    } else {
      modifySourceFile(sourceFile.fileName, sourceFile, scriptSnapshot, version, scriptKind);
    }
    return sourceFile;
  }

  return {
    createLanguageServiceSourceFile,
    updateLanguageServiceSourceFile
  };
}

function modifyVueScript(tsModule: T_TypeScript, sourceFile: ts.SourceFile): void {
  const exportDefaultObject = sourceFile.statements.find(
    st =>
      st.kind === tsModule.SyntaxKind.ExportAssignment &&
      (st as ts.ExportAssignment).expression.kind === tsModule.SyntaxKind.ObjectLiteralExpression
  );
  if (exportDefaultObject) {
    // 1. add `import Vue from 'vue'
    //    (the span of the inserted statement must be (0,0) to avoid overlapping existing statements)
    const setZeroPos = getWrapperRangeSetter(tsModule, { pos: 0, end: 0 });
    const vueImport = setZeroPos(
      tsModule.createImportDeclaration(
        undefined,
        undefined,
        setZeroPos(tsModule.createImportClause(tsModule.createIdentifier('__vueEditorBridge'), undefined as any)),
        setZeroPos(tsModule.createLiteral('vue-editor-bridge'))
      )
    );
    const statements: Array<ts.Statement> = sourceFile.statements as any;
    statements.unshift(vueImport);

    // 2. find the export default and wrap it in `__vueEditorBridge(...)` if it exists and is an object literal
    // (the span of the function construct call and *all* its members must be the same as the object literal it wraps)
    const objectLiteral = (exportDefaultObject as ts.ExportAssignment).expression as ts.ObjectLiteralExpression;
    const setObjPos = getWrapperRangeSetter(tsModule, objectLiteral);
    const vue = tsModule.setTextRange(tsModule.createIdentifier('__vueEditorBridge'), {
      pos: objectLiteral.pos,
      end: objectLiteral.pos + 1
    });
    (exportDefaultObject as ts.ExportAssignment).expression = setObjPos(
      tsModule.createCall(vue, undefined, [objectLiteral])
    );
    setObjPos(((exportDefaultObject as ts.ExportAssignment).expression as ts.CallExpression).arguments!);
  }
}

/**
 * Wrap render function with component options in the script block
 * to validate its types
 */
export function injectVueTemplate(
  tsModule: T_TypeScript,
  sourceFile: ts.SourceFile,
  renderBlock: ts.Expression[],
  scriptSrc?: string
): void {
  // add import statement for corresponding Vue file
  // so that we acquire the component type from it.
  let componentFilePath: string;

  if (scriptSrc) {
    // When script block refers external file (<script src="./MyComp.ts"></script>).
    // We need to strip `.ts` suffix to avoid a compilation error.
    componentFilePath = scriptSrc.replace(/\.ts$/, '');
  } else {
    // Importing original `.vue` file will get component type when the script is written by inline.
    componentFilePath = './' + path.basename(sourceFile.fileName.slice(0, -'.template'.length));
  }

  const componentImport = tsModule.createImportDeclaration(
    undefined,
    undefined,
    tsModule.createImportClause(tsModule.createIdentifier('__Component'), undefined),
    tsModule.createLiteral(componentFilePath)
  );

  // import helper type to handle Vue's private methods
  const helperImport = tsModule.createImportDeclaration(
    undefined,
    undefined,
    tsModule.createImportClause(
      undefined,
      tsModule.createNamedImports([
        tsModule.createImportSpecifier(undefined, tsModule.createIdentifier(renderHelperName)),
        tsModule.createImportSpecifier(undefined, tsModule.createIdentifier(componentHelperName)),
        tsModule.createImportSpecifier(undefined, tsModule.createIdentifier(iterationHelperName))
      ])
    ),
    tsModule.createLiteral('vue-editor-bridge')
  );

  // wrap render code with a function decralation
  // with `this` type of component.
  const statements = renderBlock.map(exp => tsModule.createExpressionStatement(exp));
  const renderElement = tsModule.createExpressionStatement(
    tsModule.createCall(tsModule.createIdentifier(renderHelperName), undefined, [
      // Reference to the component
      tsModule.createIdentifier('__Component'),
      // A function simulating the render function
      tsModule.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        undefined,
        tsModule.createBlock(statements)
      )
    ])
  );

  // replace the original statements with wrapped code.
  sourceFile.statements = tsModule.createNodeArray([componentImport, helperImport, renderElement]);

  // Update external module indicator to the transformed template node,
  // otherwise symbols in this template (e.g. __Component) will be put
  // into global namespace and it causes duplicated identifier error.
  (sourceFile as any).externalModuleIndicator = componentImport;
}

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(
  tsModule: T_TypeScript,
  wrapped: ts.TextRange
): <T extends ts.TextRange>(wrapperNode: T) => T {
  return wrapperNode => tsModule.setTextRange(wrapperNode, wrapped);
}
