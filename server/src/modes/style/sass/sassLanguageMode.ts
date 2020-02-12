import { LanguageMode } from '../../../embeddedSupport/languageModes';

import { TextDocument, Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types/lib/umd/main';

import { TextEdit, Position } from 'vscode-css-languageservice';

import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

import _ = require('lodash');
import * as emmet from 'vscode-emmet-helper';
import { Priority } from '../emmet';

export class SassLanguageMode implements LanguageMode {
  private config: any = {};

  constructor() {}

  getId() {
    return 'sass';
  }

  configure(c: any) {
    this.config = c;
  }

  doComplete(document: TextDocument, position: Position): CompletionList {
    const emmetCompletions = emmet.doComplete(document, position, 'sass', this.config.emmet);
    if (!emmetCompletions) {
      return { isIncomplete: false, items: [] };
    } else {
      const emmetItems = _.map(emmetCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Emmet + i.label
        };
      });
      return {
        isIncomplete: emmetCompletions.isIncomplete,
        items: emmetItems
      };
    }
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
