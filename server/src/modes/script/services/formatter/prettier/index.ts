import { FormattingOptions, TextDocument, TextEdit, Range } from 'vscode-languageserver-types';

import { Prettier, PrettierConfig, PrettierEslintFormat, PrettierVSCodeConfig } from './prettier';

export function prettierFormat(
  doc: TextDocument,
  range: Range,
  formatParams: FormattingOptions,
  prettierVSCodeConfig: PrettierVSCodeConfig
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
      parser: 'babylon',
      semi: prettierVSCodeConfig.semi,
      useTabs: prettierVSCodeConfig.useTabs
    };

    if (prettierVSCodeConfig.eslintIntegration) {
      const prettierEslint = require('prettier-eslint') as PrettierEslintFormat;

      const formattedCode =
        '\n' +
        prettierEslint({
          text: doc.getText(),
          filePath: doc.uri,
          prettierOptions
        });

      return [TextEdit.replace(range, formattedCode)];
    } else {
      const formattedCode = '\n' + bundledPrettier.format(doc.getText(), prettierOptions);
      return [TextEdit.replace(range, formattedCode)];
    }
  } catch (e) {
    return [];
  }
}
