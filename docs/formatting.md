# Formatting

Vetur has support for formatting embedded `html/css/scss/less/postcss/stylus/js/ts`.

**Vetur only has a "whole document formatter" and cannot format arbitrary ranges.**  
**As a result, only `Format Document` command will be available.**  
**`Format Selection` command wouldn't work.**

**html formatting is disabled by default. See [js-beautify-html](#js-beautify-html-deprecated).**

## Formatters

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

#### vscode-typescript

VS Code's js/ts formatter built on TypeScript language service.

`tabSize` and `insertSpaces` are read from `editor.tabSize` and `editor.insertSpaces`.

Other settings are read from `javascript.format.*` and `typescript.format.*`.

#### js-beautify-html [deprecated]

Alternative html formatter. Deprecated, turned off by default and will be removed soon.
js-beautify is not actively maintained and has many long-standing bugs. Use at your own risk.

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

## Plan

I plan to contribute to [reshape](https://github.com/reshape/reshape) formatter and drop js-beautify eventually.
