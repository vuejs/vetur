import { LanguageMode } from '../../../embeddedSupport/languageModes';

import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types';

import { TextEdit, Position } from 'vscode-css-languageservice';

import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

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
      const emmetItems = emmetCompletions.items.map(i => {
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
    if (this.config.vetur.format.defaultFormatter.sass === 'sass-formatter') {
      return [
        TextEdit.replace(
          range,
          SassFormatter.Format(document.getText(range), { ...formattingOptions, ...this.config.sass.format })
        )
      ];
    }
    return [];
  }

  onDocumentRemoved(document: TextDocument) {}
  dispose() {}
}
