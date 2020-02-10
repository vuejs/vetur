import { LanguageMode } from '../../../embeddedSupport/languageModes';

import { TextDocument, Range, FormattingOptions } from 'vscode-languageserver-types/lib/umd/main';

import { TextEdit } from 'vscode-css-languageservice';

import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

export class SassLanguageMode implements LanguageMode {
  private config: any = {};

  constructor() {}

  getId() {
    return 'sass';
  }

  configure(c: any) {
    this.config = c;
  }

  format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
    const sassConfig: SassFormatterConfig = {
      convert: true,
      deleteEmptyRows: true,
      deleteWhitespace: true,
      debug: false,
      insertSpaces: formattingOptions.insertSpaces,
      tabSize: formattingOptions.tabSize,
      setPropertySpace: true
    };

    Object.assign(sassConfig, this.config.sass.format);

    if (this.config.vetur.format.defaultFormatter.sass === 'sass-formatter') {
      return [TextEdit.replace(range, SassFormatter.Format(document.getText(range), sassConfig))];
    }
    return [];
  }

  onDocumentRemoved(document: TextDocument) {}
  dispose() {}
}
