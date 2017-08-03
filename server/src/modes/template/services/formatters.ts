import { TextDocument, Range, TextEdit, Position, FormattingOptions } from 'vscode-languageserver-types';
import { html as htmlBeautify } from 'js-beautify';

import { defaultHtmlOptions } from './formatterOptions';
import * as _ from 'lodash';
import { wrapSection } from '../../../utils/strings';

export function htmlFormat(document: TextDocument, currRange: Range, formattingOptions: FormattingOptions): TextEdit[] {

  const { value, range } = getValueAndRange(document, currRange);

  defaultHtmlOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultHtmlOptions.indent_size = formattingOptions.tabSize;

  let htmlFormattingOptions = defaultHtmlOptions;
  if (formattingOptions.html) {
    htmlFormattingOptions = _.assign(defaultHtmlOptions, formattingOptions.html);
  }

  const beautifiedHtml = htmlBeautify(value, htmlFormattingOptions);
  const needIndent = !!formattingOptions.templateInitialIndent;
  const wrappedHtml = wrapSection(beautifiedHtml, needIndent, formattingOptions);
  return [{
    range: range,
    newText: wrappedHtml
  }];
}


function getValueAndRange(document: TextDocument, currRange: Range): { value: string, range: Range } {
  let value = document.getText();
  let range = currRange;

  let includesEnd = true;
  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    includesEnd = endOffset === value.length;
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}
