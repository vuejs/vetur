import * as _ from 'lodash';
import { TextDocument, Range, TextEdit, Position, FormattingOptions } from 'vscode-languageserver-types';
import { html as htmlBeautify } from 'js-beautify';

const templateHead = '<template>';
const templateTail = '</template>';

export function htmlFormat(
  document: TextDocument,
  currRange: Range,
  formattingOptions: FormattingOptions,
  config: any
): TextEdit[] {
  const { value, range } = getValueAndRange(document, currRange);

  defaultHtmlOptions.indent_with_tabs = !formattingOptions.insertSpaces;
  defaultHtmlOptions.indent_size = formattingOptions.tabSize;

  const htmlFormattingOptions = _.assign(
    defaultHtmlOptions,
    config.vetur.format.defaultFormatterOptions['js-beautify-html'],
    { end_with_newline: false }
  );

  const beautifiedHtml = htmlBeautify(templateHead + value + templateTail, htmlFormattingOptions);
  const wrappedHtml = beautifiedHtml.substring(templateHead.length, beautifiedHtml.length - templateTail.length);
  return [
    {
      range,
      newText: wrappedHtml
    }
  ];
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string; range: Range } {
  let value = document.getText();
  let range = currRange;

  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}

const defaultHtmlOptions: HTMLBeautifyOptions = {
  brace_style: 'collapse', // [collapse|expand|end-expand|none]
  end_with_newline: false, // End output with newline
  indent_char: ' ', // Indentation character
  indent_handlebars: false, // e.g. {{#foo}}, {{/foo}}
  indent_inner_html: false, // Indent <head> and <body> sections
  indent_scripts: 'keep', // [keep|separate|normal]
  indent_size: 2, // Indentation size
  indent_with_tabs: false,
  max_preserve_newlines: 1, // Maximum number of line breaks to be preserved in one chunk (0 disables)
  preserve_newlines: true, // Whether existing line breaks before elements should be preserved
  unformatted: [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'menuitem',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
  ],
  wrap_line_length: 0, // Lines should wrap at next opportunity after this number of characters (0 disables)
  wrap_attributes: 'auto' as any
  // Wrap attributes to new lines [auto|force|force-aligned|force-expand-multiline] ["auto"]
};
