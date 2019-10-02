import { LanguageMode } from '../../../embeddedSupport/languageModes';

import { TextDocument, Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types/lib/umd/main';

import { Position, TextEdit } from 'vscode-css-languageservice';

import { DocumentContext } from '../../../types';

import { SassFormatter, SassTextDocument, SassFormatterConfig } from 'sass-formatter';

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
    const sassConfig: SassFormatterConfig = {
      convert: true,
      deleteCompact: true,
      deleteEmptyRows: true,
      deleteWhitespace: true,
      replaceSpacesOrTabs: true,
      setPropertySpace: true
    };
    Object.assign(this.config.sass.format, sassConfig);
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
            convert: this.config.sass.format.convert,
            deleteCompact: this.config.sass.format.deleteCompact,
            deleteEmptyRows: this.config.sass.format.deleteEmptyRows,
            deleteWhitespace: this.config.sass.format.deleteWhitespace,
            replaceSpacesOrTabs: this.config.sass.format.replaceSpacesOrTabs,
            setPropertySpace: this.config.sass.format.setPropertySpace
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
