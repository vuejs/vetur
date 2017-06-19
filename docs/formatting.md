# Formatting

Vetur has support for formatting embedded `html/css/scss/less/js/ts`.  
Some formatting options are available.

## General

`tabSize` and `insertSpace` are read from VSCode config `editor.tabSize` and `editor.insertSpace`.  
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

#### Future Plan

Adopt [prettier](https://github.com/prettier/prettier) as the default formatter.