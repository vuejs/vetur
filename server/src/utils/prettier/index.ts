import { FormattingOptions, TextEdit, Range } from 'vscode-languageserver-types';

import { ParserOption, Prettier, PrettierConfig, PrettierVSCodeConfig, PrettierEslintFormat } from './prettier';
import { indentSection } from '../strings';

export function prettierify(
  code: string,
  range: Range,
  initialIndent: boolean,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig,
  parser: ParserOption
): TextEdit[] {
  try {
    const prettier = require('prettier') as Prettier;
    const prettierOptions = getPrettierOptions(prettierVSCodeConfig, parser);

    const prettierifiedCode = prettier.format(code, prettierOptions);
    return [toReplaceTextedit(prettierifiedCode, range, formatParams, initialIndent)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e);
    return [];
  }
}

export function prettierEslintify(
  code: string,
  range: Range,
  filePath: string,
  initialIndent: boolean,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig,
  parser: ParserOption
): TextEdit[] {
  try {
    const prettierEslint = require('prettier-eslint') as PrettierEslintFormat;
    const prettierOptions = getPrettierOptions(prettierVSCodeConfig, parser);

    const prettierifiedCode = prettierEslint({
      text: code,
      fallbackPrettierOptions: prettierOptions
    });
    return [toReplaceTextedit(prettierifiedCode, range, formatParams, initialIndent)];
  } catch (e) {
    console.log('Prettier-Eslint format failed');
    console.error(e);
    return [];
  }
}

function getPrettierOptions(prettierVSCodeConfig: PrettierVSCodeConfig, parser: ParserOption): PrettierConfig {
  let trailingComma = prettierVSCodeConfig.trailingComma;
  if (trailingComma === true) {
    trailingComma = 'es5';
  } else if (trailingComma === false) {
    trailingComma = 'none';
  }

  return {
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
}

function toReplaceTextedit(
  prettierifiedCode: string,
  range: Range,
  formatParams: FormattingOptions,
  initialIndent: boolean
): TextEdit {
  if (initialIndent) {
    // Prettier adds newline at the end
    const formattedCode = '\n' + indentSection(prettierifiedCode, formatParams);
    return TextEdit.replace(range, formattedCode);
  } else {
    return TextEdit.replace(range, '\n' + prettierifiedCode);
  }
}
