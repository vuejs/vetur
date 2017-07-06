import { TextDocument, Range, TextEdit, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageModes } from '../modes/languageModes';

export function format (languageModes: LanguageModes, document: TextDocument, formatRange: Range, formattingOptions: FormattingOptions) {
  const embeddedModeRanges = languageModes.getModesInRange(document, formatRange);
  const embeddedEdits: TextEdit[] = [];

  embeddedModeRanges.forEach(range => {
    if (range.mode && range.mode.format) {
      const edits = range.mode.format(document, range, formattingOptions);
      for (const edit of edits) {
        embeddedEdits.push(edit);
      }
    }
  });

  return embeddedEdits;
}
