# Formatting

Vetur has support for formatting embedded `html/css/scss/less/stylus/js/ts`.  
Some formatting options are available.

We plan to switch to [prettier](https://github.com/prettier/prettier) soon.

## General

`tabSize` and `insertSpaces` are read from VSCode config `editor.tabSize` and `editor.insertSpaces`.  
Two space soft-tab is recommended for all languages.

## `html/css/scss/less`

`html` and `css/scss/less` formatting is powered by [js-beautify](https://github.com/beautify-web/js-beautify).
Options available:

- `vetur.format.html.max_preserve_newlines`
- `vetur.format.html.preserve_newlines`
- `vetur.format.html.wrap_line_length`
- `vetur.format.html.wrap_attributes`
- `vetur.format.css.newline_between_rules`
- `vetur.format.css.preserve_newlines`

IntelliSense in VSCode's config editor should provide information about these settings.  
For more info on each option, see: 

- https://github.com/beautify-web/js-beautify
- https://github.com/victorporof/Sublime-HTMLPrettify

## `stylus`

`stylus` formatting is powered by [Manta's Stylus Supremacy](https://thisismanta.github.io/stylus-supremacy).
Options available:

- `vetur.format.stylus.insertColons`
- `vetur.format.stylus.insertSemicolons`
- `vetur.format.stylus.insertBraces`
- `vetur.format.stylus.insertNewLineAroundImports`
- `vetur.format.stylus.insertNewLineAroundBlocks`
- `vetur.format.stylus.insertNewLineAroundProperties`
- `vetur.format.stylus.insertNewLineAroundOthers`
- `vetur.format.stylus.insertNewLineBetweenSelectors`
- `vetur.format.stylus.insertSpaceBeforeComment`
- `vetur.format.stylus.insertSpaceAfterComment`
- `vetur.format.stylus.insertSpaceAfterComma`
- `vetur.format.stylus.insertSpaceInsideParenthesis`
- `vetur.format.stylus.insertParenthesisAfterNegation`
- `vetur.format.stylus.insertParenthesisAroundIfCondition`
- `vetur.format.stylus.insertNewLineBeforeElse`
- `vetur.format.stylus.insertLeadingZeroBeforeFraction`
- `vetur.format.stylus.quoteChar`
- `vetur.format.stylus.sortProperties`
- `vetur.format.stylus.alwaysUseImport`
- `vetur.format.stylus.alwaysUseNot`
- `vetur.format.stylus.alwaysUseAtBlock`
- `vetur.format.stylus.alwaysUseExtends`
- `vetur.format.stylus.alwaysUseNoneOverZero`
- `vetur.format.stylus.alwaysUseZeroWithoutUnit`
- `vetur.format.stylus.reduceMarginAndPaddingValues`

For more info on each option, see https://thisismanta.github.io/stylus-supremacy

 Note that [Stylus Supremacy](https://thisismanta.github.io/stylus-supremacy/#vscode) is also available as a separate Visual Studio Code extension, and has nothing to do with this extension.

## `js/ts`

`js/ts` formatting is powered by TypeScript's language service. Options available:

- `vetur.format.js.InsertSpaceBeforeFunctionParenthesis`

Other formatting options have sensible defaults but are not exposed.

```ts
interface FormatCodeSettings extends EditorSettings {
  insertSpaceAfterCommaDelimiter?: boolean;
  insertSpaceAfterSemicolonInForStatements?: boolean;
  insertSpaceBeforeAndAfterBinaryOperators?: boolean;
  insertSpaceAfterConstructor?: boolean;
  insertSpaceAfterKeywordsInControlFlowStatements?: boolean;
  insertSpaceAfterFunctionKeywordForAnonymousFunctions?: boolean;
  insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis?: boolean;
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets?: boolean;
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces?: boolean;
  insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces?: boolean;
  insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces?: boolean;
  insertSpaceAfterTypeAssertion?: boolean;
  insertSpaceBeforeFunctionParenthesis?: boolean;
  placeOpenBraceOnNewLineForFunctions?: boolean;
  placeOpenBraceOnNewLineForControlBlocks?: boolean;
}
```

#### Adding Option

If you'd like an option from `js-beautify` or TypeScript's language service exposed, open an issue for discussion.  
I'd like to keep Vetur's options minimal.
