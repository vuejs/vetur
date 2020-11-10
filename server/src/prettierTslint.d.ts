declare module 'prettier-tslint' {
  type ParserOptions = import('prettier').ParserOptions;
  type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

  interface PrettierTslintOptions {
    /**
     * The path of the file being formatted
     * can be used in lieu of `tslintConfig` (tslint will be used to find the
     * relevant config for the file). Will also be used to load the `text` if
     * `text` is not provided.
     */
    filePath?: string;
    /**
     * The text (TypeScript code) to format
     */
    text: string;
    /**
     * The path to the tslint module to use.
     * Will default to require.resolve('tslint')
     */
    tslintPath?: string;
    /**
     * The config to use for formatting
     * with TSLint.
     */
    tslintConfig?: object;
    /**
     * The options to pass for
     * formatting with `prettier`. If not provided, prettier-tslint will attempt
     * to create the options based on the tslintConfig
     */
    prettierOptions?: Partial<ParserOptions>;
    /**
     * The options to pass for
     * formatting with `prettier` if the given option is not inferrable from the
     * tslintConfig.
     */
    fallbackPrettierOptions?: Partial<ParserOptions>;
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
   * Format typescript code with prettier-tslint.
   *
   * @param {PrettierTslintOptions} options - Option bag for prettier-tslint.
   * @returns {string} the formatted code.
   */
  type PrettierTslintFormat = (options: PrettierTslintOptions) => string;

  const prettierTslint: { format: PrettierTslintFormat };

  export = prettierTslint;
}
