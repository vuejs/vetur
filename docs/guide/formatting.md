# Formatting

Vetur has support for formatting embedded `html/pug/css/scss/less/postcss/stylus/js/ts`.

**Vetur only has a "whole document formatter" and cannot format arbitrary ranges.**  
**As a result, only the `Format Document` command is available.**  
**The `Format Selection` command does not work.**

## Formatters

These formatters are available:

- [`prettier`](https://github.com/prettier/prettier): For css/scss/less/js/ts.
- [`prettier`](https://github.com/prettier/prettier) with [@prettier/plugin-pug](https://github.com/prettier/plugin-pug): For pug.
- [`prettier-eslint`](https://github.com/prettier/prettier-eslint): For js. Run `prettier` and `eslint --fix`.
- [`stylus-supremacy`](https://github.com/ThisIsManta/stylus-supremacy): For stylus.
- [`vscode-typescript`](https://github.com/Microsoft/TypeScript): For js/ts. The same js/ts formatter for VS Code.
- [`sass-formatter`](https://github.com/TheRealSyler/sass-formatter): For the .sass section of the files.
- ~~[`prettyhtml`](https://github.com/Prettyhtml/prettyhtml): 🚧 [DEPRECATED] For html.~~

Vetur bundles all the above formatters. When Vetur observes a local install of the formatter, it'll prefer to use the local version.

You can choose each language's default formatter in VS Code config, `vetur.format.defaultFormatter`.
**Setting a language's formatter to `none` disables formatter for that language.**

Current default:

```json
{
  "vetur.format.defaultFormatter.html": "prettier",
  "vetur.format.defaultFormatter.pug": "prettier",
  "vetur.format.defaultFormatter.css": "prettier",
  "vetur.format.defaultFormatter.postcss": "prettier",
  "vetur.format.defaultFormatter.scss": "prettier",
  "vetur.format.defaultFormatter.less": "prettier",
  "vetur.format.defaultFormatter.stylus": "stylus-supremacy",
  "vetur.format.defaultFormatter.js": "prettier",
  "vetur.format.defaultFormatter.ts": "prettier",
  "vetur.format.defaultFormatter.sass": "sass-formatter"
}
```

## Settings

A global switch `vetur.format.enable` toggles Vetur formatter on and off. This is useful if you want to let Prettier handle `*.vue` file formatting completely.

- The benefits of using Prettier: CLI support, one single formatter.
- The downsides: No Stylus support, can't use `js-beautify`, `prettyhtml` or TypeScript formatter.

### Vetur Formatter Config

These two settings are inherited by all formatters:

```json
{
  "vetur.format.options.tabSize": 2,
  "vetur.format.options.useTabs": false
}
```

However, when a local config (such as `.prettierrc`) is found, Vetur will prefer it. For example:

- `.prettierrc` is present but does not set `tabWidth` explicitly: Vetur uses `vetur.format.options.tabSize` as the `tabWidth` for prettier.
- `.prettierrc` is present and sets `tabWidth` explicitly: Vetur ignores `vetur.format.options.tabSize`, always using the value in `.prettierrc`.

`useTabs` works the same way.

#### [prettier](https://prettier.io/)

Opinionated formatter. Settings are read from `.prettierrc` at project root. See format at https://prettier.io/docs/en/configuration.html.

If you want to set global prettier setting, either:

- Make a `.prettierrc` config at your home directory
- Use the below config and do NOT include a `.prettierrc` in your home directory

  ```json
  "vetur.format.defaultFormatterOptions": {
    "prettier": {
      // Prettier option here
      "semi": false
    }
  }
  ```

#### [prettier-eslint](https://github.com/prettier/prettier-eslint)

Prettier + `eslint --fix`. Settings are read from `.prettierrc` and `.eslintrc` at project root.

Global config: Same as `prettier` global config.

#### ~~[prettyhtml](https://github.com/Prettyhtml/prettyhtml)~~

**🚧 DEPRECATED as [no longer in active development](https://github.com/Prettyhtml/prettyhtml).**

Settings include:

```json
"vetur.format.defaultFormatterOptions": {
  "prettyhtml": {
    "printWidth": 100, // No line exceeds 100 characters
    "singleQuote": false // Prefer double quotes over single quotes
  }
}
```

`prettier` options are read from local `.prettierrc` config.

#### [vscode-typescript](https://github.com/microsoft/typescript)

VS Code's js/ts formatter built on [TypeScript](https://github.com/microsoft/typescript) language service.

Settings are read from `javascript.format.*` and `typescript.format.*`.

#### [js-beautify-html](https://github.com/beautify-web/js-beautify)

Alternative html formatter.

Default settings are [here](https://github.com/vuejs/vetur/blob/master/server/src/modes/template/services/htmlFormat.ts). You can override them by setting `vetur.format.defaultFormatterOptions.js-beautify-html`.

```json
"vetur.format.defaultFormatterOptions": {
  "js-beautify-html": {
    // js-beautify-html settings here
  }
}
```

#### [stylus-supremacy](https://thisismanta.github.io/stylus-supremacy/)

Other settings are read from `stylusSupremacy.*`. You can install [Stylus Supremacy extension](https://marketplace.visualstudio.com/items?itemName=thisismanta.stylus-supremacy) to get IntelliSense for settings, but Vetur will work without it. A useful default:

```json
{
  "stylusSupremacy.insertBraces": false,
  "stylusSupremacy.insertColons": false,
  "stylusSupremacy.insertSemicolons": false
}
```

#### [sass-formatter](https://github.com/TheRealSyler/sass-formatter)

Settings are read from `sass.format.*`. You can install [Sass extension](https://marketplace.visualstudio.com/items?itemName=Syler.sass-indented) to get IntelliSense for settings, but Vetur will work without it. A useful default:

```json
{
  // enables debug mode.
  "sass.format.debug": false,
  // removes empty rows.
  "sass.format.deleteEmptyRows": true,
  // removes trailing whitespace.
  "sass.format.deleteWhitespace": true,
  // Convert scss/css to sass.
  "sass.format.convert": true,
  // If true space between the property: value, is always set to 1.
  "sass.format.setPropertySpace": true
}
```
