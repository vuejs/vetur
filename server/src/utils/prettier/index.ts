import { FormattingOptions, TextEdit, Range } from 'vscode-languageserver-types';

import { ParserOption, Prettier, PrettierConfig, PrettierVSCodeConfig } from './prettier';
import { indentSection } from '../strings';

export function pretterify(
  code: string,
  range: Range,
  initialIndent: boolean,
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

    const pretterifiedCode = bundledPrettier.format(code, prettierOptions);
    if (initialIndent) {
      // Prettier adds newline at the end
      const formattedCode = '\n' + indentSection(pretterifiedCode, formatParams);
      return [TextEdit.replace(range, formattedCode)];
    } else {
      return [TextEdit.replace(range, '\n' + pretterifiedCode)];
    }
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e);
    return [];
  }
}
