import type ts from 'typescript';
import { CompletionItemKind, SymbolKind } from 'vscode-languageserver';

export function isVueFile(path: string) {
  return path.endsWith('.vue');
}

/**
 * If the path ends with `.vue.ts`, it's a `.vue` file pre-processed by Vetur
 * to be used in TS Language Service
 *
 * Note: all files outside any node_modules folder are considered,
 * EXCEPT if they are added to tsconfig via 'files' or 'include' properties
 */
export function isVirtualVueFile(path: string, projectFiles: Set<string>) {
  return path.endsWith('.vue.ts') && (!path.includes('node_modules') || projectFiles.has(path.slice(0, -'.ts'.length)));
}

/**
 * If the path ends with `.vue.template`, it's a `.vue` file's template part
 * pre-processed by Vetur to calculate template diagnostics in TS Language Service
 */
export function isVirtualVueTemplateFile(path: string) {
  return path.endsWith('.vue.template');
}

export function findNodeByOffset(root: ts.Node, offset: number): ts.Node | undefined {
  if (offset < root.getStart() || root.getEnd() < offset) {
    return undefined;
  }

  const childMatch = root.getChildren().reduce<ts.Node | undefined>((matched, child) => {
    return matched || findNodeByOffset(child, offset);
  }, undefined);

  return childMatch ? childMatch : root;
}

export function toCompletionItemKind(kind: ts.ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case 'primitive type':
    case 'keyword':
      return CompletionItemKind.Keyword;
    case 'var':
    case 'local var':
      return CompletionItemKind.Variable;
    case 'property':
    case 'getter':
    case 'setter':
      return CompletionItemKind.Field;
    case 'function':
    case 'method':
    case 'construct':
    case 'call':
    case 'index':
      return CompletionItemKind.Function;
    case 'enum':
      return CompletionItemKind.Enum;
    case 'module':
      return CompletionItemKind.Module;
    case 'class':
      return CompletionItemKind.Class;
    case 'interface':
      return CompletionItemKind.Interface;
    case 'warning':
      return CompletionItemKind.File;
    case 'script':
      return CompletionItemKind.File;
    case 'directory':
      return CompletionItemKind.Folder;
  }

  return CompletionItemKind.Property;
}

export function toSymbolKind(kind: ts.ScriptElementKind): SymbolKind {
  switch (kind) {
    case 'var':
    case 'local var':
    case 'const':
      return SymbolKind.Variable;
    case 'function':
    case 'local function':
      return SymbolKind.Function;
    case 'enum':
      return SymbolKind.Enum;
    case 'module':
      return SymbolKind.Module;
    case 'class':
      return SymbolKind.Class;
    case 'interface':
      return SymbolKind.Interface;
    case 'method':
      return SymbolKind.Method;
    case 'property':
    case 'getter':
    case 'setter':
      return SymbolKind.Property;
  }
  return SymbolKind.Variable;
}
