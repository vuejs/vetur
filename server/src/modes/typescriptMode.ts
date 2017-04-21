import * as ts from 'typescript';
import path = require('path');
import { parseComponent } from "vue-template-compiler";

export function isVue(filename: string): boolean {
  return path.extname(filename) === '.vue';
}

export function parseVue(text: string): string {
  const output = parseComponent(text, { pad: 'space' });
  if (output && output.script && output.script.content) {
    return output.script.content;
  }
  else {
    return text;
  }
}

export function createUpdater() {
  const clssf = ts.createLanguageServiceSourceFile;
  const ulssf = ts.updateLanguageServiceSourceFile;
  return {
    createLanguageServiceSourceFile(fileName: string, scriptSnapshot: ts.IScriptSnapshot, scriptTarget: ts.ScriptTarget, version: string, setNodeParents: boolean, scriptKind?: ts.ScriptKind): ts.SourceFile {
      let sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
      if (isVue(fileName)) {
        modifyVueSource(sourceFile);
      }
      return sourceFile;
    },
    updateLanguageServiceSourceFile(sourceFile: ts.SourceFile, scriptSnapshot: ts.IScriptSnapshot, version: string, textChangeRange: ts.TextChangeRange, aggressiveChecks?: boolean): ts.SourceFile {
      sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
      if (isVue(sourceFile.fileName)) {
        modifyVueSource(sourceFile);
      }
      return sourceFile;
    }
  }
}

/** Works like Array.prototype.find, returning `undefined` if no element satisfying the predicate is found. */
function find<T>(array: T[], predicate: (element: T, index: number) => boolean): T | undefined {
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (predicate(value, i)) {
      return value;
    }
  }
  return undefined;
}

function modifyVueSource(sourceFile: ts.SourceFile): void {
  const exportDefaultObject = find(sourceFile.statements, st => st.kind === ts.SyntaxKind.ExportAssignment &&
    (st as ts.ExportAssignment).expression.kind === ts.SyntaxKind.ObjectLiteralExpression);
  if (exportDefaultObject) {
    const isVueAlreadyImported = find(sourceFile.statements, st => isImportOfName(st, 'Vue'));
    if (!isVueAlreadyImported) {
      // 1. add `import Vue from 'vue'
      //    (the span of the inserted statement must be (0,0) to avoid overlapping existing statements)
      const setZeroPos = getWrapperRangeSetter({ pos: 0, end: 0 });
      const vueImport = setZeroPos(ts.createImportDeclaration(undefined,
        undefined,
        setZeroPos(ts.createImportClause(ts.createIdentifier('Vue'), undefined)),
        setZeroPos(ts.createLiteral('vue'))));
      sourceFile.statements.unshift(vueImport);
    }

    // 2. find the export default and wrap it in `new Vue(...)` if it exists and is an object literal
    //    (the span of the wrapping construct call and *all* its members must be the same as the object literal it wraps)
    const objectLiteral = (exportDefaultObject as ts.ExportAssignment).expression as ts.ObjectLiteralExpression;
    const setObjPos = getWrapperRangeSetter(objectLiteral);
    const vue = ts.setTextRange(ts.createIdentifier('Vue'), { pos: objectLiteral.pos, end: objectLiteral.pos + 1 });
    (exportDefaultObject as ts.ExportAssignment).expression = setObjPos(ts.createNew(vue, undefined, [objectLiteral]));
    setObjPos(((exportDefaultObject as ts.ExportAssignment).expression as ts.NewExpression).arguments);
  }
}

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(wrapped: ts.TextRange): <T extends ts.TextRange>(wrapperNode: T) => T {
  return <T extends ts.TextRange>(wrapperNode: T) => ts.setTextRange(wrapperNode, wrapped);
}

function isImportOfName(statement: ts.Statement, name: string): boolean {
    if (statement.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDecl = statement as ts.ImportDeclaration;
      // import (incomplete statement)
      if (!importDecl.importClause) {
        return false;
      }
      // import Vue from ...
      if (importDecl.importClause.name && importDecl.importClause.name.text === name) {
        return true;
      }
      if (!importDecl.importClause.namedBindings) {
        return false;
      }
      // import { Vue } from ...
      if (importDecl.importClause.namedBindings.kind === ts.SyntaxKind.NamedImports) {
        const namedImports = importDecl.importClause.namedBindings as ts.NamedImports;
        if(namedImports.elements && namedImports.elements.some(spec => spec.name.text === name)) {
          return true;
        }
      }
      // import * as Vue from ...
      if (importDecl.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
        const namespaceImport = importDecl.importClause.namedBindings as ts.NamespaceImport;
        return namespaceImport.name && namespaceImport.name.text === name;
      }
    }
    // import Vue (incomplete statement)
    if (statement.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
      const importEqDecl = statement as ts.ImportEqualsDeclaration;
      return importEqDecl.name && importEqDecl.name.text === name;
    }
    return false;
}