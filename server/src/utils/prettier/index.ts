import { FormattingOptions, TextDocument, TextEdit, Range } from 'vscode-languageserver-types';

import { ParserOption, Prettier, PrettierConfig, PrettierVSCodeConfig } from './prettier';

export function pretterify(
  code: string,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig,
  parser: ParserOption
) {
  return prettierFormat(code, range, formatParams, prettierVSCodeConfig, parser);
}

export function prettierifyJs(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig
) {
  return prettierFormat(doc.getText(), range, formatParams, prettierVSCodeConfig, 'babylon');
}
export function prettierifyTs(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig
) {
  return prettierFormat(doc.getText(), range, formatParams, prettierVSCodeConfig, 'typescript');
}

function prettierFormat(
  code: string,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig,
  parser: ParserOption
): TextEdit[] {
  try {
    const bundledPrettier = require('prettier') as Prettier;

    let trailingComma = prettierVSCodeConfig.trailingComma;
    if (trailingComma === true) {
      trailingComma = 'es5';
    } else if (trailingComma === false) {
      trailingComma = 'none';
    }

    const prettierOptions: PrettierConfig = {
      printWidth: prettierVSCodeConfig.printWidth,
      tabWidth: prettierVSCodeConfig.tabWidth,
      singleQuote: prettierVSCodeConfig.singleQuote,
      trailingComma,
      bracketSpacing: prettierVSCodeConfig.bracketSpacing,
      jsxBracketSameLine: prettierVSCodeConfig.jsxBracketSameLine,
      parser,
      semi: prettierVSCodeConfig.semi,
      useTabs: prettierVSCodeConfig.useTabs
    };

    const formattedCode = '\n' + bundledPrettier.format(code, prettierOptions);
    return [TextEdit.replace(range, formattedCode)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e);
    return [];
  }
}
