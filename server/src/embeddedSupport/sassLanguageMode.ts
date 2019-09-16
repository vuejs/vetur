import { LanguageMode } from './languageModes';

import { LanguageModelCache, getLanguageModelCache } from './languageModelCache';

import { TextDocument, Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types/lib/umd/main';

import { HTMLDocument, parseHTMLDocument } from '../modes/template/parser/htmlParser';

import { Position, TextEdit } from 'vscode-css-languageservice/lib/umd/cssLanguageTypes';

import { DocumentContext } from '../types';

import { SassFormatter, SassTextDocument } from 'sass-formatter';

export class SassLanguageMode implements LanguageMode {
  private vueDocuments: LanguageModelCache<HTMLDocument>;

  private config: any = {};

  constructor() {
    this.vueDocuments = getLanguageModelCache<HTMLDocument>(10, 60, document => parseHTMLDocument(document));
  }

  getId() {
    return 'html';
  }

  configure(c: any) {
    this.config = c;
  }

  doValidation(document: TextDocument): any {
    return undefined;
  }
  doComplete(document: TextDocument, position: Position) {
    return CompletionList.create();
  }
  doHover(document: TextDocument, position: Position): any {
    return undefined;
  }
  findDocumentHighlight(document: TextDocument, position: Position) {
    return [];
  }
  findDocumentLinks(document: TextDocument, documentContext: DocumentContext) {
    return [];
  }
  findDocumentSymbols(document: TextDocument) {
    return [];
  }
  format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
    return [
      TextEdit.replace(
        range,
        SassFormatter.Format(new SassTextDocument(document.getText(range)), {
          insertSpaces: formattingOptions.insertSpaces,
          tabSize: formattingOptions.tabSize
        })
      )
    ];
  }
  findDefinition(document: TextDocument, position: Position): any {
    return undefined;
  }
  onDocumentRemoved(document: TextDocument) {
    this.vueDocuments.onDocumentRemoved(document);
  }
  dispose() {
    this.vueDocuments.dispose();
  }
}
