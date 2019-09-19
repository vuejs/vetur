import { LanguageMode } from '../../../embeddedSupport/languageModes';

import { TextDocument, Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types/lib/umd/main';

import { Position, TextEdit } from 'vscode-css-languageservice';

import { DocumentContext } from '../../../types';

import { SassFormatter, SassTextDocument } from 'sass-formatter';

export class SassLanguageMode implements LanguageMode {
  private config: any = {};

  constructor() {}

  getId() {
    return 'sass';
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
    let sassConfig: any = {
      convert: true,
      deleteCompact: true,
      deleteEmptyRows: true,
      deleteWhitespace: true,
      replaceSpacesOrTabs: true,
      setPropertySpace: true
    };
    if (this.config.sass && this.config.sass.format) {
      sassConfig = this.config.sass.format;
    }
    return [
      TextEdit.replace(
        range,
        SassFormatter.Format(
          new SassTextDocument(document.getText(range)),
          {
            insertSpaces: formattingOptions.insertSpaces,
            tabSize: formattingOptions.tabSize
          },
          {
            convert: sassConfig.convert,
            deleteCompact: sassConfig.deleteCompact,
            deleteEmptyRows: sassConfig.deleteEmptyRows,
            deleteWhitespace: sassConfig.deleteWhitespace,
            replaceSpacesOrTabs: sassConfig.replaceSpacesOrTabs,
            setPropertySpace: sassConfig.setPropertySpace
          }
        )
      )
    ];
  }
  findDefinition(document: TextDocument, position: Position): any {
    return undefined;
  }
  onDocumentRemoved(document: TextDocument) {}
  dispose() {}
}
