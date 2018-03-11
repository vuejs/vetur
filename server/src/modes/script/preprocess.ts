import * as ts from 'typescript';
import * as path from 'path';

import { getDocumentRegions } from '../embeddedSupport';
import { TextDocument } from 'vscode-languageserver-types';

export function isVue(filename: string): boolean {
  return path.extname(filename) === '.vue';
}

export function parseVue(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getDocumentRegions(doc);
  const script = regions.getEmbeddedDocumentByType('script');
  return script.getText() || 'export default {};';
}

function isTSLike(scriptKind: ts.ScriptKind | undefined) {
  return scriptKind === ts.ScriptKind.TS || scriptKind === ts.ScriptKind.TSX;
}

export function createUpdater() {
  const clssf = ts.createLanguageServiceSourceFile;
  const ulssf = ts.updateLanguageServiceSourceFile;
  const scriptKindTracker = new WeakMap<ts.SourceFile, ts.ScriptKind|undefined>();

  return {
    createLanguageServiceSourceFile(
      fileName: string,
      scriptSnapshot: ts.IScriptSnapshot,
      scriptTarget: ts.ScriptTarget,
      version: string,
      setNodeParents: boolean,
      scriptKind?: ts.ScriptKind
    ): ts.SourceFile {
      const sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
      scriptKindTracker.set(sourceFile, scriptKind);
      if (isVue(fileName) && !isTSLike(scriptKind)) {
        modifyVueSource(sourceFile);
      }
      return sourceFile;
    },
    updateLanguageServiceSourceFile(
      sourceFile: ts.SourceFile,
      scriptSnapshot: ts.IScriptSnapshot,
      version: string,
      textChangeRange: ts.TextChangeRange,
      aggressiveChecks?: boolean
    ): ts.SourceFile {
      const scriptKind = scriptKindTracker.get(sourceFile);
      sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
      if (isVue(sourceFile.fileName) && !isTSLike(scriptKind)) {
        modifyVueSource(sourceFile);
      }
      return sourceFile;
    }
  };
}

function modifyVueSource(sourceFile: ts.SourceFile): void {
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

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(wrapped: ts.TextRange): <T extends ts.TextRange>(wrapperNode: T) => T {
  return <T extends ts.TextRange>(wrapperNode: T) => ts.setTextRange(wrapperNode, wrapped);
}
