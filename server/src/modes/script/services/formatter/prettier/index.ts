import { FormattingOptions, TextDocument, TextEdit, Range } from 'vscode-languageserver-types';

import { Prettier, PrettierConfig, PrettierVSCodeConfig } from './prettier';

export function prettierFormatJs(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig
) {
  return prettierFormat(doc, range, formatParams, prettierVSCodeConfig, true);
}
export function prettierFormatTs(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig
) {
  return prettierFormat(doc, range, formatParams, prettierVSCodeConfig, false);
}

function prettierFormat(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig,
  isJavascript: boolean
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
      parser: isJavascript ? 'babylon' : 'typescript',
      semi: prettierVSCodeConfig.semi,
      useTabs: prettierVSCodeConfig.useTabs
    };

    const formattedCode = '\n' + bundledPrettier.format(doc.getText(), prettierOptions);
    return [TextEdit.replace(range, formattedCode)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e);
    return [];
  }
}
