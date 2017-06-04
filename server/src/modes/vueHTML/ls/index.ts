import { createScanner } from './parser/htmlScanner';
import { parse } from './parser/htmlParser';
import { doComplete } from './services/htmlCompletion';
import { doScaffoldComplete } from './services/vueCompletion';
import { doHover } from './services/htmlHover';
import { htmlFormat, cssFormat } from './services/formatters';
import { findDocumentLinks } from './services/htmlLinks';
import { findDocumentHighlights } from './services/htmlHighlighting';
import { findDocumentSymbols } from './services/htmlSymbolsProvider';
import {
  TextDocument,
  Position,
  CompletionItem,
  CompletionList,
  Hover,
  Range,
  SymbolInformation,
  Diagnostic,
  TextEdit,
  DocumentHighlight,
  FormattingOptions,
  MarkedString,
  DocumentLink
} from 'vscode-languageserver-types';

export {
  TextDocument,
  Position,
  CompletionItem,
  CompletionList,
  Hover,
  Range,
  SymbolInformation,
  Diagnostic,
  TextEdit,
  DocumentHighlight,
  FormattingOptions,
  MarkedString,
  DocumentLink
};

export interface CompletionConfiguration {
  [provider: string]: boolean;
}

export interface Node {
  tag: string;
  start: number;
  end: number;
  endTagStart: number;
  children: Node[];
  parent: Node;
  attributes?: { [name: string]: string };
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

export declare type VueHTMLDocument = {
  roots: Node[];
  findNodeBefore(offset: number): Node;
  findNodeAt(offset: number): Node;
};

export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export interface LanguageService {
  createScanner(input: string): Scanner;
  parseVueHTMLDocument(document: TextDocument): VueHTMLDocument;
  findDocumentHighlights(
    document: TextDocument,
    position: Position,
    htmlDocument: VueHTMLDocument
  ): DocumentHighlight[];
  doComplete(
    document: TextDocument,
    position: Position,
    htmlDocument: VueHTMLDocument,
    options?: CompletionConfiguration
  ): CompletionList;
  doScaffoldComplete(): CompletionList;
  doHover(document: TextDocument, position: Position, htmlDocument: VueHTMLDocument): Hover;
  htmlFormat(document: TextDocument, range: Range, formattingOptions: FormattingOptions): TextEdit[];
  cssFormat(document: TextDocument, range: Range, formattingOptions: FormattingOptions): TextEdit[];
  findDocumentLinks(document: TextDocument, documentContext: DocumentContext): DocumentLink[];
  findDocumentSymbols(document: TextDocument, htmlDocument: VueHTMLDocument): SymbolInformation[];
}

export function getVueHTMLLanguageService(): LanguageService {
  return {
    createScanner,
    parseVueHTMLDocument: document => parse(document.getText()),
    doComplete,
    doScaffoldComplete,
    doHover,
    htmlFormat,
    cssFormat,
    findDocumentHighlights,
    findDocumentLinks,
    findDocumentSymbols
  };
}
