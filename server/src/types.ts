export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export enum CodeActionReqKind {
  CombinedCodeFix,
  RefactorAction,
  OrganizeImports
}

export interface CodeActionReqBase<K, A> {
  kind: K;
  fileName: string;
  textRange: {
    pos: number;
    end: number;
  };
  formatSettings: any;
  preferences: {};
  arguments: A;
}

export type CodeActionReq =
  | CodeActionReqBase<CodeActionReqKind.RefactorAction, RefactorAction>
  | CodeActionReqBase<CodeActionReqKind.CombinedCodeFix, CombinedCodeFixAction>
  | CodeActionReqBase<CodeActionReqKind.OrganizeImports, {}>;

export interface RefactorAction {
  refactorName: string;
  actionName: string;
  description: string;
}

export interface CombinedCodeFixAction {
  fixId: {};
}
