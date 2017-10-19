# Formatting

Vetur has support for formatting embedded `html/css/scss/less/postcss/stylus/js/ts`.  

## General

Choose each language's default formatter in `vetur.format.defaultFormatter`.  
Currently there are 4 formatters:

- prettier: css/scss/less/postcss/js/ts
- vscode-typescript: js/ts
- js-beautify-html: html (deprecated and turned off by default)
- stylus-supremacy: stylus
- none: disable formatting for that language

Settings are mostly read from other namespaces.

## Settings

`tabSize` and `insertSpaces` are read from VSCode config `editor.tabSize` and `editor.insertSpaces`.  
Two space soft-tab is recommended for all languages.

Settings are read from:

- prettier: `prettier.*`. You can install [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) to get IntelliSense for the settings, but Vetur will work without it.
- vscode-typescript
  - js: `javascript.format.*`
  - ts: `typescript.format.*`
- js-beautify-html: Default settings are [here](https://github.com/vuejs/vetur/blob/master/server/src/modes/template/services/htmlFormat.ts). You can override them by setting `vetur.format.defaultFormatterOptions.js-beautify-html`.
- stylus-supremacy: `stylusSupremacy.*`. You can install [Stylus Supremacy extension](https://marketplace.visualstudio.com/items?itemName=thisismanta.stylus-supremacy) to get IntelliSense for settings, but Vetur will work without it. A useful default:

  ```json
  {
    "stylusSupremacy.insertBraces": false,
    "stylusSupremacy.insertColons": false,
    "stylusSupremacy.insertSemicolons": false
  }
  ```

## Plan

I plan to contribute to prettier's html formatter and drop js-beautify eventually.
