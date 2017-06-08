export {TextDocument, Position, CompletionItem, CompletionList, Hover, Range, SymbolInformation, Diagnostic, TextEdit, DocumentHighlight, FormattingOptions, MarkedString, DocumentLink } from 'vscode-languageserver-types';
import { doVueComplete } from './vueCompletion'
import { format } from './formatting'

export interface Node {
  tag: string;
  start: number;
  end: number;
  endTagStart: number;
  children: Node[];
  parent: Node;
  attributes?: {[name: string]: string};
}


export enum TokenType {
  StartCommentTag,
  Comment,
  EndCommentTag,
  StartTagOpen,
  StartTagClose,
  StartTagSelfClose,
  StartTag,
  EndTagOpen,
  EndTagClose,
  EndTag,
  DelimiterAssign,
  AttributeName,
  AttributeValue,
  StartDoctypeTag,
  Doctype,
  EndDoctypeTag,
  Content,
  Whitespace,
  Unknown,
  Script,
  Styles,
  EOS
}

export enum ScannerState {
  WithinContent,
  AfterOpeningStartTag,
  AfterOpeningEndTag,
  WithinDoctype,
  WithinTag,
  WithinEndTag,
  WithinComment,
  WithinScriptContent,
  WithinStyleContent,
  AfterAttributeName,
  BeforeAttributeValue
}

export interface Scanner {
  scan(): TokenType;
  getTokenType(): TokenType;
  getTokenOffset(): number;
  getTokenLength(): number;
  getTokenEnd(): number;
  getTokenText(): string;
  getTokenError(): string;
  getScannerState(): ScannerState;
}

export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export function getVls() {
  return {
    doVueComplete,
    format
  };
}
