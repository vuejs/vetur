# Formatting

Vetur has support for formatting embedded `html/css/scss/less/postcss/stylus/js/ts`.

**Vetur only has a "whole document formatter" and cannot format arbitrary ranges.**  
**As a result, only the `Format Document` command is available.**  
**The `Format Selection` command does not work.**

## Formatters

These formatters are available:

- [`prettier`](https://github.com/prettier/prettier): For css/scss/less/js/ts.
- [`prettyhtml`](https://github.com/Prettyhtml/prettyhtml): For html.
- [`stylus-supremacy'](https://github.com/ThisIsManta/stylus-supremacy): For stylus.
- [`vscode-typescript`](https://github.com/Microsoft/TypeScript): For js/ts. The same js/ts formatter for VS Code.

Choose each language's default formatter in VS Code config, `vetur.format.defaultFormatter`.
**Setting a language's formatter to `none` disables formatter for that language.**

Current default:

```json
{
  "vetur.format.defaultFormatter.html": "none",
  "vetur.format.defaultFormatter.css": "prettier",
  "vetur.format.defaultFormatter.postcss": "prettier",
  "vetur.format.defaultFormatter.scss": "prettier",
  "vetur.format.defaultFormatter.less": "prettier",
  "vetur.format.defaultFormatter.stylus": "stylus-supremacy",
  "vetur.format.defaultFormatter.js": "prettier",
  "vetur.format.defaultFormatter.ts": "prettier"
}
```

#### prettier

Settings precedence:

1. `.prettierrc` at project root. See format at https://prettier.io/docs/en/configuration.html
2. `prettier.*`. You can install [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) to get IntelliSense for settings, but Vetur will work without it.

ESLint integration: `"prettier.eslintIntegration": true`. Settings are read from `.eslintrc`.

#### prettyhtml

**This will likely become the default html formatter soon.**

https://github.com/Prettyhtml/prettyhtml

`tabWidth` and `useTabs` are read from `editor.tabSize` and `editor.insertSpaces`.

Other settings include:

```json
"vetur.format.defaultFormatterOptions": {
  "prettyhtml": {
    "printWidth": 100, // No line exceeds 100 characters
    "singleQuote": false // Prefer double quotes over single quotes
  }
}
```

#### vscode-typescript

VS Code's js/ts formatter built on TypeScript language service.

`tabSize` and `insertSpaces` are read from `editor.tabSize` and `editor.insertSpaces`.

Other settings are read from `javascript.format.*` and `typescript.format.*`.

#### js-beautify-html [deprecated]

Alternative html formatter. Deprecated and turned off by default. Use at your own risk.

`tabSize` and `insertSpaces` are read from `editor.tabSize` and `editor.insertSpaces`.

Default settings are [here](https://github.com/vuejs/vetur/blob/master/server/src/modes/template/services/htmlFormat.ts). You can override them by setting `vetur.format.defaultFormatterOptions.js-beautify-html`.

```json
"vetur.format.defaultFormatterOptions": {
  "js-beautify-html": {
    // js-beautify-html settings here
  }
}
```

#### stylus-supremacy

`tabSize` and `insertSpaces` are read from `editor.tabSize` and `editor.insertSpaces`.

Other settings are read from `stylusSupremacy.*`. You can install [Stylus Supremacy extension](https://marketplace.visualstudio.com/items?itemName=thisismanta.stylus-supremacy) to get IntelliSense for settings, but Vetur will work without it. A useful default:

```json
{
  "stylusSupremacy.insertBraces": false,
  "stylusSupremacy.insertColons": false,
  "stylusSupremacy.insertSemicolons": false
}
```
