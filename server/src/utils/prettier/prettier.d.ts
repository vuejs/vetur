export type ParserOption = 'babylon' | 'flow' | 'css' | 'scss' | 'less' | 'typescript' | 'json' | 'graphql';
type TrailingCommaOption = 'none' | 'es5' | 'all' | boolean; /* deprecated boolean*/

/**
 * Prettier configuration
 */
export interface PrettierConfig {
  printWidth: number;
  tabWidth: number;
  singleQuote: boolean;
  trailingComma: TrailingCommaOption;
  bracketSpacing: boolean;
  jsxBracketSameLine: boolean;
  parser: ParserOption;
  semi: boolean;
  useTabs: boolean;
  arrowParens: 'avoid' | 'always';
}
/**
 * prettier-vscode specific configuration
 */
interface ExtensionConfig {
  /**
   * Use 'prettier-eslint' instead of 'prettier'.
   * Other settings will only be fallbacks in case they could not be inferred from eslint rules.
   */
  eslintIntegration: boolean;
  /**
   * Use 'prettier-stylelint' instead of 'prettier'.
   * Other settings will only be fallbacks in case they could not be inferred from eslint rules.
   */
  stylelintIntegration: boolean;
  /**
   * Path to '.prettierignore' or similar.
   */
  ignorePath: string;
  /**
   * Language ids to run javascript prettier on.
   */
  javascriptEnable: ('javascript' | 'javascriptreact' | string)[];
  /**
   * Language ids to run typescript prettier on.
   */
  typescriptEnable: ('typescript' | 'typescriptreact' | string)[];
  /**
   * Language ids to run postcss prettier on.
   */
  cssEnable: ('css' | 'less' | 'scss' | string)[];
  /**
   * Language ids to run json prettier on
   */
  jsonEnable: ('json' | string)[];
  /**
   * Language ids to run graphql prettier on
   */
  graphqlEnable: ('graphql' | string)[];
}

/**
 * Configuration for prettier-vscode
 */
export type PrettierVSCodeConfig = ExtensionConfig & PrettierConfig;
export interface Prettier {
  format(text: string, options?: Partial<PrettierConfig>): string;
  resolveConfig(
    filePath: string,
    options?: {
      /**
       * Use cache, defaults to true.
       */
      useCache: boolean;
    }
  ): Promise<PrettierConfig>;
  clearConfigCache(): void;
  readonly version: string;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
interface PrettierEslintOptions {
  /**
   * The path of the file being formatted
   * can be used in lieu of `eslintConfig` (eslint will be used to find the
   * relevant config for the file). Will also be used to load the `text` if
   * `text` is not provided.
   */
  filePath?: string;
  /**
   * The text (JavaScript code) to format
   */
  text: string;
  /**
   * The path to the eslint module to use.
   * Will default to require.resolve('eslint')
   */
  eslintPath?: string;
  /**
   * The config to use for formatting
   * with ESLint.
   */
  eslintConfig?: object;
  /**
   * The options to pass for
   * formatting with `prettier`. If not provided, prettier-eslint will attempt
   * to create the options based on the eslintConfig
   */
  prettierOptions?: PrettierConfig;
  /**
   * The options to pass for
   * formatting with `prettier` if the given option is not inferrable from the
   * eslintConfig.
   */
  fallbackPrettierOptions?: PrettierConfig;
  /**
   * The level for the logs
   */
  logLevel?: LogLevel;
  /**
   * Run Prettier Last. Default false
   */
  prettierLast?: boolean;
}

/**
 * Format javascript code with prettier-eslint.
 *
 * @param {PrettierEslintOptions} options - Option bag for prettier-eslint.
 * @returns {string} the formatted code.
 */
export type PrettierEslintFormat = (options: PrettierEslintOptions) => string;

export interface PrettierStylelint {
  format(options: PrettierEslintOptions): Promise<string>;
  resolveConfig(
    file: string,
    options?: {
      useCache: boolean;
    }
  ): Promise<[PrettierConfig, Object]>;
}
