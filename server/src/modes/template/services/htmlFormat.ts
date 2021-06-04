import _ from 'lodash';
import { Range, TextEdit, Position } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { html as htmlBeautify, HTMLBeautifyOptions } from 'js-beautify';
import { getFileFsPath } from '../../../utils/paths';
import { VLSFormatConfig } from '../../../config';
import { prettierify } from '../../../utils/prettier';
import { DependencyService, RuntimeLibrary } from '../../../services/dependencyService';
import { ParserOptions as PrettierParserOptions } from 'prettier';

const TEMPLATE_HEAD = '<template>';
const TEMPLATE_TAIL = '</template>';

type PrettyHtmlConfig = RuntimeLibrary['@starptech/prettyhtml'] extends (input: string, options: infer R) => any
  ? NonNullable<R>
  : never;

export function htmlFormat(
  dependencyService: DependencyService,
  document: TextDocument,
  currRange: Range,
  vlsFormatConfig: VLSFormatConfig
): TextEdit[] {
  if (vlsFormatConfig.defaultFormatter.html === 'none') {
    return [];
  }

  const { value, range } = getValueAndRange(document, currRange);

  const originalSource = TEMPLATE_HEAD + value + TEMPLATE_TAIL;
  let beautifiedHtml: string;

  if (vlsFormatConfig.defaultFormatter.html === 'prettyhtml') {
    beautifiedHtml = formatWithPrettyHtml(
      dependencyService,
      getFileFsPath(document.uri),
      originalSource,
      vlsFormatConfig
    );
  } else if (vlsFormatConfig.defaultFormatter.html === 'prettier') {
    const prettierResult = formatWithPrettier(
      dependencyService,
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

function formatWithPrettyHtml(
  dependencyService: DependencyService,
  fileFsPath: string,
  input: string,
  vlsFormatConfig: VLSFormatConfig
): string {
  const prettier = dependencyService.get('prettier', fileFsPath).module;
  const prettierrcOptions = prettier.resolveConfig.sync(fileFsPath, { useCache: false }) || null;

  const prettyhtml = dependencyService.get('@starptech/prettyhtml', fileFsPath).module;

  const result = prettyhtml(input, getPrettyHtmlOptions(prettierrcOptions, vlsFormatConfig));
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
  dependencyService: DependencyService,
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  initialIndent: boolean
) {
  return prettierify(dependencyService, code, fileFsPath, 'vue', range, vlsFormatConfig, initialIndent);
}

function getPrettyHtmlOptions(
  prettierrcOptions: Partial<PrettierParserOptions> | null,
  vlsFormatConfig: VLSFormatConfig
) {
  const fromVls = {
    useTabs: vlsFormatConfig.options.useTabs,
    tabWidth: vlsFormatConfig.options.tabSize
  };

  const fromPrettier: Partial<PrettyHtmlConfig> = {};
  if (prettierrcOptions) {
    fromPrettier.useTabs = prettierrcOptions.useTabs;
    fromPrettier.tabWidth = prettierrcOptions.tabWidth;
    fromPrettier.printWidth = prettierrcOptions.printWidth;
  }

  return {
    ...fromVls,
    ...fromPrettier,
    usePrettier: true,
    prettier: {
      ...prettierrcOptions
    },
    ...vlsFormatConfig.defaultFormatterOptions['prettyhtml']
  };
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
