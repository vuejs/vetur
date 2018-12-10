import { TextEdit, Range } from 'vscode-languageserver-types';

import { ParserOption, Prettier, PrettierEslintFormat } from './prettier';
import { indentSection } from '../strings';

import { requireLocalPkg } from './requirePkg';
import { VLSFormatConfig } from '../../config';

export function prettierify(
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: ParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = requireLocalPkg(fileFsPath, 'prettier') as Prettier;
    const prettierOptions = getPrettierOptions(prettier, fileFsPath, parser, vlsFormatConfig);

    const prettierifiedCode = prettier.format(code, prettierOptions);
    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e.message);
    return [];
  }
}

export function prettierEslintify(
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: ParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = requireLocalPkg(fileFsPath, 'prettier') as Prettier;
    const prettierEslint = requireLocalPkg(fileFsPath, 'prettier-eslint') as PrettierEslintFormat;

    const prettierOptions = getPrettierOptions(prettier, fileFsPath, parser, vlsFormatConfig);

    const prettierifiedCode = prettierEslint({
      prettierOptions: { parser },
      text: code,
      fallbackPrettierOptions: prettierOptions
    });

    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier-Eslint format failed');
    console.error(e.message);
    return [];
  }
}

function getPrettierOptions(
  prettierModule: Prettier,
  fileFsPath: string,
  parser: ParserOption,
  vlsFormatConfig: VLSFormatConfig
) {
  const prettierrcOptions = prettierModule.resolveConfig.sync(fileFsPath, { useCache: false });

  if (prettierrcOptions) {
    prettierrcOptions.tabWidth = prettierrcOptions.tabWidth || vlsFormatConfig.options.tabSize;
    prettierrcOptions.useTabs = prettierrcOptions.useTabs || vlsFormatConfig.options.useTabs;
    prettierrcOptions.parser = parser;

    return prettierrcOptions;
  } else {
    const vscodePrettierOptions = vlsFormatConfig.defaultFormatterOptions.prettier || {};
    vscodePrettierOptions.tabWidth = vscodePrettierOptions.tabWidth || vlsFormatConfig.options.tabSize;
    vscodePrettierOptions.useTabs = vscodePrettierOptions.useTabs || vlsFormatConfig.options.useTabs;
    vscodePrettierOptions.parser = parser;

    return vscodePrettierOptions;
  }
}

function toReplaceTextedit(
  prettierifiedCode: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  initialIndent: boolean
): TextEdit {
  if (initialIndent) {
    // Prettier adds newline at the end
    const formattedCode = '\n' + indentSection(prettierifiedCode, vlsFormatConfig);
    return TextEdit.replace(range, formattedCode);
  } else {
    return TextEdit.replace(range, '\n' + prettierifiedCode);
  }
}
