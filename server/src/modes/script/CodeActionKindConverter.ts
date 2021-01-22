/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CodeActionKind } from 'vscode-languageserver';

export interface TSCodeActionKind {
  kind: CodeActionKind;
  matches(refactor: { actionName: string }): boolean;
}

/* tslint:disable:variable-name */
const Extract_Function = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorExtract + '.function',
  matches: refactor => refactor.actionName.startsWith('function_')
});

const Extract_Constant = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorExtract + '.constant',
  matches: refactor => refactor.actionName.startsWith('constant_')
});

const Extract_Type = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorExtract + '.type',
  matches: refactor => refactor.actionName.startsWith('Extract to type alias')
});

const Extract_Interface = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorExtract + '.interface',
  matches: refactor => refactor.actionName.startsWith('Extract to interface')
});

const Move_NewFile = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.Refactor + '.move' + '.newFile',
  matches: refactor => refactor.actionName.startsWith('Move to a new file')
});

const Rewrite_Import = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorRewrite + '.import',
  matches: refactor =>
    refactor.actionName.startsWith('Convert namespace import') ||
    refactor.actionName.startsWith('Convert named imports')
});

const Rewrite_Export = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorRewrite + '.export',
  matches: refactor =>
    refactor.actionName.startsWith('Convert default export') || refactor.actionName.startsWith('Convert named export')
});

const Rewrite_Arrow_Braces = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorRewrite + '.arrow' + '.braces',
  matches: refactor =>
    refactor.actionName.startsWith('Convert default export') || refactor.actionName.startsWith('Convert named export')
});

const Rewrite_Parameters_ToDestructured = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorRewrite + '.parameters' + '.toDestructured',
  matches: refactor => refactor.actionName.startsWith('Convert parameters to destructured object')
});

const Rewrite_Property_GenerateAccessors = Object.freeze<TSCodeActionKind>({
  kind: CodeActionKind.RefactorRewrite + '.property' + '.generateAccessors',
  matches: refactor => refactor.actionName.startsWith("Generate 'get' and 'set' accessors")
});
/* tslint:enable:variable-name */

const allKnownCodeActionKinds = [
  Extract_Function,
  Extract_Constant,
  Extract_Type,
  Extract_Interface,
  Move_NewFile,
  Rewrite_Import,
  Rewrite_Export,
  Rewrite_Arrow_Braces,
  Rewrite_Parameters_ToDestructured,
  Rewrite_Property_GenerateAccessors
];

export function getCodeActionKind(refactor: { actionName: string }): CodeActionKind {
  return allKnownCodeActionKinds.find(kind => kind.matches(refactor))?.kind ?? CodeActionKind.Refactor;
}
