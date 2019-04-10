import * as _ from 'lodash';
import { TextDocument, Range, TextEdit, Position } from 'vscode-languageserver-types';
import { html as htmlBeautify } from 'js-beautify';
import { IPrettyHtml } from './prettyhtml';
import { requireLocalPkg } from '../../../utils/prettier/requirePkg';
import { getFileFsPath } from '../../../utils/paths';
import { VLSFormatConfig } from '../../../config';
import { Prettier } from '../../../utils/prettier/prettier';
import { prettierify } from '../../../utils/prettier';

const TEMPLATE_HEAD = '<template>';
const TEMPLATE_TAIL = '</template>';

export function htmlFormat(document: TextDocument, currRange: Range, vlsFormatConfig: VLSFormatConfig): TextEdit[] {
  if (vlsFormatConfig.defaultFormatter.html === 'none') {
    return [];
  }

  const { value, range } = getValueAndRange(document, currRange);

  const originalSource = TEMPLATE_HEAD + value + TEMPLATE_TAIL;
  let beautifiedHtml: string;

  if (vlsFormatConfig.defaultFormatter.html === 'prettyhtml') {
    beautifiedHtml = formatWithPrettyHtml(getFileFsPath(document.uri), originalSource, vlsFormatConfig);
  } else if (vlsFormatConfig.defaultFormatter.html === 'prettier') {
    const prettierResult = formatWithPrettier(
      originalSource,
      getFileFsPath(document.uri),
      currRange,
      vlsFormatConfig,
      false
    );
    if (prettierResult[0] && prettierResult[0].newText) {
      beautifiedHtml = prettierResult[0].newText.trim();
    } else {
      beautifiedHtml = originalSource;
    }
  } else {
    beautifiedHtml = formatWithJsBeautify(originalSource, vlsFormatConfig);
  }

  const wrappedHtml = beautifiedHtml.substring(TEMPLATE_HEAD.length, beautifiedHtml.length - TEMPLATE_TAIL.length);
  return [
    {
      range,
      newText: wrappedHtml
    }
  ];
}

function formatWithPrettyHtml(fileFsPath: string, input: string, vlsFormatConfig: VLSFormatConfig): string {
  const prettier = requireLocalPkg(fileFsPath, 'prettier') as Prettier;
  const prettierrcOptions = prettier.resolveConfig.sync(fileFsPath, { useCache: false }) || null;

  const prettyhtml: IPrettyHtml = requireLocalPkg(fileFsPath, '@starptech/prettyhtml');

  const result = prettyhtml(input, {
    useTabs: vlsFormatConfig.options.useTabs,
    tabWidth: vlsFormatConfig.options.tabSize,
    usePrettier: true,
    prettier: {
      ...prettierrcOptions
    },
    ...vlsFormatConfig.defaultFormatterOptions['prettyhtml']
  });
  return result.contents.trim();
}

function formatWithJsBeautify(input: string, vlsFormatConfig: VLSFormatConfig): string {
  const htmlFormattingOptions = _.assign(
    defaultHtmlOptions,
    {
      indent_with_tabs: vlsFormatConfig.options.useTabs,
      indent_size: vlsFormatConfig.options.tabSize
    },
    vlsFormatConfig.defaultFormatterOptions['js-beautify-html'],
    { end_with_newline: false }
  );

  return htmlBeautify(input, htmlFormattingOptions);
}

function formatWithPrettier(
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  initialIndent: boolean
) {
  return prettierify(code, fileFsPath, range, vlsFormatConfig, 'vue', initialIndent);
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
  end_with_newline: false, // End output with newline
  indent_char: ' ', // Indentation character
  indent_handlebars: false, // e.g. {{#foo}}, {{/foo}}
  indent_inner_html: false, // Indent <head> and <body> sections
  indent_scripts: 'keep', // [keep|separate|normal]
  indent_size: 2, // Indentation size
  indent_with_tabs: false,
  max_preserve_newlines: 1, // Maximum number of line breaks to be preserved in one chunk (0 disables)
  preserve_newlines: true, // Whether existing line breaks before elements should be preserved
  unformatted: [], // Tags that shouldn't be formatted. Causes mis-alignment
  wrap_line_length: 0, // Lines should wrap at next opportunity after this number of characters (0 disables)
  wrap_attributes: 'force-expand-multiline' as any
  // Wrap attributes to new lines [auto|force|force-aligned|force-expand-multiline] ["auto"]
};
