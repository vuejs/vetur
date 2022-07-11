import { LanguageMode } from '../../../embeddedSupport/languageModes';

import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Range, FormattingOptions, CompletionList } from 'vscode-languageserver-types';

import { TextEdit, Position } from 'vscode-css-languageservice';

import { SassFormatter, SassFormatterConfig } from 'sass-formatter';

import * as emmet from 'vscode-emmet-helper';
import { StylePriority } from '../emmet';
import { EnvironmentService } from '../../../services/EnvironmentService';

export class SassLanguageMode implements LanguageMode {
  constructor(private env: EnvironmentService) {}

  getId() {
    return 'sass';
  }

  doComplete(document: TextDocument, position: Position): CompletionList {
    const emmetCompletions = emmet.doComplete(document, position, 'sass', this.env.getConfig().emmet);
    if (!emmetCompletions) {
      return { isIncomplete: false, items: [] };
    } else {
      const emmetItems = emmetCompletions.items.map(i => {
        return {
          ...i,
          sortText: StylePriority.Emmet + i.label
        };
      });
      return {
        isIncomplete: emmetCompletions.isIncomplete,
        items: emmetItems
      };
    }
  }

  format(document: TextDocument, range: Range, formattingOptions: FormattingOptions) {
    if (this.env.getConfig().vetur.format.defaultFormatter.sass === 'sass-formatter') {
      return [
        TextEdit.replace(
          range,
          SassFormatter.Format(document.getText(range), { ...formattingOptions, ...this.env.getConfig()?.sass?.format })
        )
      ];
    }
    return [];
  }

  onDocumentRemoved(document: TextDocument) {}
  dispose() {}
}
