import { TextDocument, Range, TextEdit, Position, FormattingOptions } from 'vscode-languageserver-types';
import { html as htmlBeautify, css as cssBeautify } from 'js-beautify';

import { repeat } from '../utils/strings';
import { defaultHtmlOptions, defaultCssOptions } from './formatterOptions';
import * as _ from 'lodash';

export function htmlFormat(document: TextDocument, currRange: Range, formattingOptions: FormattingOptions): TextEdit[] {
  const { value, range } = getValueAndRange(document, currRange);

  defaultHtmlOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultHtmlOptions.indent_size = formattingOptions.tabSize;

  let htmlFormattingOptions = defaultHtmlOptions;
  if (formattingOptions.html) {
    htmlFormattingOptions = _.assign(defaultHtmlOptions, formattingOptions.html);
  }

  const beautifiedHtml: string = htmlBeautify(value, htmlFormattingOptions);
  const initialIndent = generateIndent(1, formattingOptions);
  const indentedHtml = ('\n' + beautifiedHtml).replace(/\n/g, '\n' + initialIndent) + '\n';
  return [{
    range: range,
    newText: indentedHtml
  }];
}

export function cssFormat(document: TextDocument, currRange: Range, formattingOptions: FormattingOptions): TextEdit[] {
  const { value, range } = getValueAndRange(document, currRange);

  defaultCssOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultCssOptions.indent_size = formattingOptions.tabSize;

  let cssFormattingOptions = defaultCssOptions;
  if (formattingOptions.css) {
    cssFormattingOptions = _.assign(defaultCssOptions, formattingOptions.css);
  }

  const beautifiedCss: string = cssBeautify(value, cssFormattingOptions);
  if (formattingOptions.styleInitialIndent) {
    const initialIndent = generateIndent(1, formattingOptions);
    const indentedCss = ('\n' + beautifiedCss).replace(/\n/g, '\n' + initialIndent) + '\n';
    return [{
      range: range,
      newText: indentedCss
    }];
  } else {
    return [{
      range: range,
      newText: '\n' + beautifiedCss + '\n'
    }];
  }
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string, range: Range } {
  let value = document.getText();
  let range = currRange;

  let includesEnd = true;
  if (currRange) {
    let startOffset = document.offsetAt(currRange.start);
    let endOffset = document.offsetAt(currRange.end);
    includesEnd = endOffset === value.length;
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}

function generateIndent(level: number, options: FormattingOptions) {
  if (options.insertSpaces) {
    return repeat(' ', level * options.tabSize);
  } else {
    return repeat('\t', level);
  }
}