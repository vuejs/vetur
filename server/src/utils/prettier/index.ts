import { TextEdit, Range } from 'vscode-languageserver-types';

import type { BuiltInParserName, CustomParser } from 'prettier';
import { indentSection } from '../strings';

import { VLSFormatConfig } from '../../config';
import { logger } from '../../log';
import path from 'path';
import { DependencyService, RuntimeLibrary } from '../../services/dependencyService';

const VLS_PATH = path.resolve(__dirname, '../../../');

type PrettierParserOption = BuiltInParserName | CustomParser;

export function prettierify(
  dependencyService: DependencyService,
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: PrettierParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = dependencyService.get('prettier', fileFsPath).module;
    const prettierOptions = getPrettierOptions(dependencyService, prettier, fileFsPath, parser, vlsFormatConfig);
    logger.logDebug(`Using prettier. Options\n${JSON.stringify(prettierOptions)}`);

    const prettierifiedCode = prettier.format(code, prettierOptions);
    if (prettierifiedCode === '' && code.trim() !== '') {
      throw Error('Empty result from prettier');
    }

    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e.message);
    return [];
  }
}

export function prettierEslintify(
  dependencyService: DependencyService,
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: PrettierParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = dependencyService.get('prettier', fileFsPath).module;
    const prettierEslint = dependencyService.get('prettier-eslint', fileFsPath).module;

    const prettierOptions = getPrettierOptions(dependencyService, prettier, fileFsPath, parser, vlsFormatConfig);
    logger.logDebug(`Using prettier-eslint. Options\n${JSON.stringify(prettierOptions)}`);

    const prettierifiedCode = prettierEslint({
      filePath: fileFsPath,
      prettierOptions: { parser },
      text: code,
      fallbackPrettierOptions: prettierOptions
    });
    if (prettierifiedCode === '' && code.trim() !== '') {
      throw Error('Empty result from prettier');
    }

    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier-Eslint format failed');
    console.error(e.message);
    return [];
  }
}
export function prettierTslintify(
  dependencyService: DependencyService,
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: PrettierParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = dependencyService.get('prettier', fileFsPath).module;
    const prettierTslint = dependencyService.get('prettier-tslint', fileFsPath).module.format;

    const prettierOptions = getPrettierOptions(dependencyService, prettier, fileFsPath, parser, vlsFormatConfig);
    logger.logDebug(`Using prettier-tslint. Options\n${JSON.stringify(prettierOptions)}`);

    const prettierifiedCode = prettierTslint({
      prettierOptions: { parser },
      text: code,
      filePath: fileFsPath,
      fallbackPrettierOptions: prettierOptions
    });

    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier-Tslint format failed');
    console.error(e.message);
    return [];
  }
}

export function prettierPluginPugify(
  dependencyService: DependencyService,
  code: string,
  fileFsPath: string,
  range: Range,
  vlsFormatConfig: VLSFormatConfig,
  parser: PrettierParserOption,
  initialIndent: boolean
): TextEdit[] {
  try {
    const prettier = dependencyService.get('prettier', fileFsPath).module;
    const prettierPluginPug = dependencyService.get('@prettier/plugin-pug', fileFsPath).module;
    const prettierOptions = getPrettierOptions(dependencyService, prettier, fileFsPath, parser, vlsFormatConfig);
    prettierOptions.pluginSearchDirs = [];
    prettierOptions.plugins = Array.isArray(prettierOptions.plugins)
      ? [...prettierOptions.plugins, prettierPluginPug]
      : [prettierPluginPug];
    logger.logDebug(`Using prettier. Options\n${JSON.stringify(prettierOptions)}`);

    const prettierifiedCode = prettier.format(code, prettierOptions);
    return [toReplaceTextedit(prettierifiedCode, range, vlsFormatConfig, initialIndent)];
  } catch (e) {
    console.log('Prettier format failed');
    console.error(e.message);
    return [];
  }
}

function getPrettierOptions(
  dependencyService: DependencyService,
  prettierModule: RuntimeLibrary['prettier'],
  fileFsPath: string,
  parser: PrettierParserOption,
  vlsFormatConfig: VLSFormatConfig
) {
  const prettierrcOptions = prettierModule.resolveConfig.sync(fileFsPath, { useCache: false });

  if (prettierrcOptions) {
    prettierrcOptions.tabWidth = prettierrcOptions.tabWidth || vlsFormatConfig.options.tabSize;
    prettierrcOptions.useTabs = prettierrcOptions.useTabs || vlsFormatConfig.options.useTabs;
    prettierrcOptions.parser = parser;
    if (dependencyService.useWorkspaceDependencies) {
      // For loading plugins such as @prettier/plugin-pug
      (prettierrcOptions as { pluginSearchDirs: string[] }).pluginSearchDirs = [dependencyService.workspacePath];
    }

    return prettierrcOptions;
  } else {
    const vscodePrettierOptions = vlsFormatConfig.defaultFormatterOptions.prettier || {};
    vscodePrettierOptions.tabWidth = vscodePrettierOptions.tabWidth || vlsFormatConfig.options.tabSize;
    vscodePrettierOptions.useTabs = vscodePrettierOptions.useTabs || vlsFormatConfig.options.useTabs;
    vscodePrettierOptions.parser = parser;
    if (dependencyService.useWorkspaceDependencies) {
      // For loading plugins such as @prettier/plugin-pug
      vscodePrettierOptions.pluginSearchDirs = [dependencyService.workspacePath];
    }

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
