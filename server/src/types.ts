import { LanguageId } from './embeddedSupport/embeddedSupport';

export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export enum CodeActionDataKind {
  CombinedCodeFix,
  RefactorAction,
  OrganizeImports
}

export interface BaseCodeActionData {
  uri: string;
  languageId: LanguageId;
  kind: CodeActionDataKind;
  textRange: { pos: number; end: number };
}

export interface RefactorActionData extends BaseCodeActionData {
  kind: CodeActionDataKind.RefactorAction;
  refactorName: string;
  actionName: string;
  description: string;
  notApplicableReason?: string;
}

export interface CombinedFixActionData extends BaseCodeActionData {
  kind: CodeActionDataKind.CombinedCodeFix;
  fixId: {};
}

export interface OrganizeImportsActionData extends BaseCodeActionData {
  kind: CodeActionDataKind.OrganizeImports;
}

export type CodeActionData = RefactorActionData | CombinedFixActionData | OrganizeImportsActionData;

interface SemanticTokenClassification {
  classificationType: number;
  modifierSet: number;
}

export interface SemanticTokenData extends SemanticTokenClassification {
  line: number;
  character: number;
  length: number;
}

export interface SemanticTokenOffsetData extends SemanticTokenClassification {
  start: number;
  length: number;
}
