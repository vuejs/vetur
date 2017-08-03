import { TextDocument, Range, TextEdit, Position, FormattingOptions } from 'vscode-languageserver-types';
import { html as htmlBeautify } from 'js-beautify';

import { defaultHtmlOptions } from './formatterOptions';
import * as _ from 'lodash';
import * as deindent from 'de-indent';

export function htmlFormat(document: TextDocument, currRange: Range, formattingOptions: FormattingOptions): TextEdit[] {
  const userSetting: any = formattingOptions.html;

  const { value: _value, range } = getValueAndRange(document, currRange);
  const value = deindent(_value);

  defaultHtmlOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultHtmlOptions.indent_size = formattingOptions.tabSize;

  let htmlFormattingOptions = defaultHtmlOptions;
  if (userSetting) {
    htmlFormattingOptions = _.assign(defaultHtmlOptions, userSetting);
  }

  let beautifiedHtml = '\n' + htmlBeautify(value, htmlFormattingOptions);
  if (userSetting.initial_indent) {
    const initialIndent = generateIndent(1, formattingOptions);
    beautifiedHtml = beautifiedHtml.replace(/\n/g, '\n' + initialIndent);
  }
  beautifiedHtml += '\n';
  return [{
    range: range,
    newText: beautifiedHtml
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

function generateIndent(level: number, options: FormattingOptions) {
  if (options.insertSpaces) {
    return _.repeat(' ', level * options.tabSize);
  } else {
    return _.repeat('\t', level);
  }
}
