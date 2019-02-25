export type ParserOption =
  | 'babylon' // deprecated
  | 'babel'
  | 'babel-flow'
  | 'flow'
  | 'typescript'
  | 'postcss' // deprecated
  | 'css'
  | 'less'
  | 'scss'
  | 'json'
  | 'json5'
  | 'json-stringify'
  | 'graphql'
  | 'markdown'
  | 'vue'
  | 'html'
  | 'angular'
  | 'mdx'
  | 'yaml';

type TrailingCommaOption = 'none' | 'es5' | 'all';

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
  proseWrap: 'preserve' | 'always' | 'never';
  arrowParens: 'avoid' | 'always';
  rangeStart: number;
  rangeEnd: number;
  filepath: string;
  jsxSingleQuote: boolean;
  htmlWhitespaceSensitivity: 'css' | 'strict' | 'ignore';
  endOfLine: 'auto' | 'lf' | 'crlf' | 'cr';
}

export interface Prettier {
  format(text: string, options?: Partial<PrettierConfig>): string;
  resolveConfig: {
    sync(filePath: string, options?: { useCache: boolean }): Partial<PrettierConfig> | null;
  };
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
  prettierOptions?: Partial<PrettierConfig>;
  /**
   * The options to pass for
   * formatting with `prettier` if the given option is not inferrable from the
   * eslintConfig.
   */
  fallbackPrettierOptions?: Partial<PrettierConfig>;
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
