# Changelog

### 0.9.5 | 2017-08-22

- slm support. #366.
- Color Decorator support with `vetur.colorDecorators.enable`. #28.
- sass lang removed. Now recommend [sass extension](https://marketplace.visualstudio.com/items?itemName=robinbentley.sass-indented) for sass grammar.
- Fix the multicursor in `scaffold` snippet.
- Initial support for goto definition and find references.
- `vetur.format.js.InsertSpaceBeforeFunctionParenthesis` now control both space before named and anonymous functions. #226.

### 0.9.4 | 2017-08-16

- Integrate new Emmet support for html, css, scss, less and stylus. #232.
- Revamp doc on website.
- Fix formatter adding spaces to empty lines in `<template>`. #360.

### 0.9.3 | 2017-07-26

- Upgrade eslint-plugin-vue to 3.8.0. Fix false positives for `v-for`. #261.
- Make `vetur.validation.style` apply to postcss. #350.

### 0.9.2 | 2017-07-22

- Support tsx. #337.
- Initial support for postcss. #344.
- Add scaffold snippet for scoped style tag. #335.
- Enhanced support for closing backstick and comment in js. #329.
- Fix a syntax highlight issue for tags containing dashes. #328.

Special shoutout to [@HerringtonDarkholme](https://github.com/HerringtonDarkholme) who has been contributing to most of the improvements in Vetur for the last many versions.

Congrats to [@g-plane](https://github.com/g-plane) and [@armano2](https://github.com/armano2) who landed their first PR in Vetur!

### 0.9.1 | 2017-07-12

- Fix a crash for importing non-existing .vue.ts file. #321.

### 0.9.0 | 2017-07-08

- Onsen UI support. #308.
- Suppress all Vetur error logs (still accessible in output tab). #296.
- Fix an error for using `lang` http attributes in `<template>`. #293.
- Fix path mapping error. #301 and #213.
- Fix a bug where typing `import` at top of `<script>` causes VLS crash. #285.

### 0.8.7 | 2017-06-28

- Upgrade eslint-plugin-vue to address some template linting issues. #294.
- Skip template checking for empty template. #272.

### 0.8.6 | 2017-06-26

- Remove `vue-template-compiler` as dependency. Fix #250, #277 and #286.
- `@` IntelliSense in template and better IntelliSense ordering. #256.

### 0.8.5 | 2017-06-23

- Fix a Windows path handling issue that causes IntelliSense not to work. #265.

### 0.8.4 | 2017-06-23

- Fix an issue that removes space after taking IntelliSense suggestion. #244.
- Fix an issue that causes ESLint to report error on wrong line. #263.

### 0.8.3 | 2017-06-23

- Add `vetur.validation.template` option to toggle vue-html validation using `eslint-plugin-vue@beta`. #235 and #257.
- Fix a language server crash. #258.

### 0.8.2 | 2017-06-22

- Republishing with correct vue-language-server.

### 0.8.1 | 2017-06-22

- Published wrong veresion of vue-language-server in 0.8...oops.

### 0.8.0 | 2017-06-22

- eslint-plugin-vue support. #235.
- Initial stylus support. #227.
- Element UI support. #234.
- Let hover display code signature with syntax highlight. #247.

Shoutout to @HerringtonDarkholme who helped implementing many new features!

### 0.7.0 | 2017-06-04

- Correct syntax highlighting for longer directives such as `@click.capture.stop`. #79.
- Doc at https://octref.github.io/vetur/
- Disable js/ts language server to prevent crash when opening vue files without workspace. #160.
- Restrcit scaffold snippets to vue region (outside all other regions) strictly. #219.
- Fix a `textDocument/hover` error. #191.
- Incorporate [vls](https://github.com/octref/vls) into vetur's `/server`.

### 0.6.10 | 2017-06-01

- Fix a language service restart issue.
- Fix a `documentHighlight` error. #215.
- Fix a Windows path handling issue causing IntelliSense unusable. #205.

### 0.6.10 | 2017-05-16

- Add back symbol, highlight and signature provider. #194.

### 0.6.9 | 2017-05-14

- Update grammar to allow tags like <template-component> in vue-html. #189.
- Update grammar to allow html comments outside all regions. #195.
- Handle new file creation so vetur's IntelliSense work on it. #192.
- Enable breakpoints for vue files. Doc for debugging coming later in #201.
- Add `vetur.format.styleInitialIndent` and `vetur.format.scriptInitialIndent` to allow initial indent in these sections for formatting. #121.

### 0.6.8 | 2017-05-08

- Hot fix for a Windows crash caused by incorrect path handling.

### 0.6.7 | 2017-05-07

- Fix a bug of path handling on Windows. #183.
- Add top level scaffolding snippets, such as `scaffold`, `template with pug`, `style with less`.
- Add `vetur.validation.style` and `vetur.validation.script` to allow toggling validation.

### 0.6.6 | 2017-05-06

- Add back hover provider. #181.

### 0.6.5 | 2017-05-05

- Fix a formatting bug for vue-html. #99.
- Disable unused language features.
- Check file is included in tsconfig/jsconfig before providing language features to prevent TS crash.

### 0.6.4 | 2017-04-27

- When running Vue Language Server, do not use debug port. #162 and #148.
- Avoid module resolution in `node_modules`, so CPU and Memory usage won't spike. #131.

### 0.6.3 | 2017-04-26

- Include `vue-template-compiler` in vetur to avoid version mismatch. #135.

### 0.6.2 | 2017-04-24

- Fix various Vue Language Server crashes.

### 0.6.1 | 2017-04-20

- Fix a bug in module resolution that causes Vue Langauge Server to crash. #122 and #123.

### 0.6.0 | 2017-04-19

- Improve formatting support with [options](https://github.com/octref/vetur/blob/master/docs/formatting.md) to fine-tune formatting style in `js-beautify` and TypeScript's language service.
- Improve `sass` syntax highlighting based on grammar from [robinbentley/vscode-sass-indented](https://github.com/robinbentley/vscode-sass-indented). #41.

Thanks to [@sandersn](https://github.com/sandersn)'s [PR](https://github.com/octref/vetur/pull/94):
- Preliminary TypeScript support (try `<script lang="ts">`)
- Improved IntelliSense for `js/ts` in Vue SFC.
- Correct Module Resolution (try `npm i lodash @types/lodash` and use lodash in your Vue SFC).

### 0.5.6 | 2017-03-20

- Update js-beautify to include `preserve_newlines` options for css/scss/less.

### 0.5.5 | 2017-03-17

- Fix wrongly marked regions. #92.

### 0.5.4 | 2017-03-16

- Change default formatting options to preserve new lines in html.
- Change default formatting options for html to force-align attributes. #77.
- Re-enable scss/less error checking

### 0.5.3 | 2017-03-16

- Hotfix to include correct dependencies in LanguageClient.

### 0.5.2 | 2017-03-15

- Re-enable formatter based on js-beautify. #82.

### 0.5.1 | 2017-03-06

- Temporarily disable formatter. Will enable once #82 is addressed.

### 0.5.0 | 2017-03-06

- vetur now depends on https://github.com/octref/vls to provide some IntelliSense.
- Provide IntelliSense for all `v-` directives and `key`, `ref`, `slot`, #26.

### 0.4.1 | 2017-03-02

- Relax grammar to allow `<script type="text/babel">`. #70.
- Move `files.associations` setup in README, as vue file is not associated with html by default in VSCode.

### 0.4.0 | 2017-02-27

- Port new changes from VSCode's html extension, which fixes
  - Embedded formatter for html/css/scss/less/js
  - IntelliSense for html

### 0.3.8 | 2017-02-23

- Allow `<template lang="html">`. #52.

### 0.3.7 | 2017-02-23

- Syntax highlighting for coffee and postcss. #50 and #56.
- Various grammar fixes.

### 0.3.6 | 2017-02-21

- Support nested `<template>`. #48.
- Use vue-html grammar for vue-html lang. #45.

### 0.3.5 | 2017-02-20

- Add vue-html as a language. #44.
- Remove vue-js and use VSCode's javascript grammar.

### 0.3.4 | 2017-02-19

- Allow scope & module on css style tag. #43.

### 0.3.3 | 2017-02-19

- Split vue grammar into vue SFC and vue's html
- Tweak language region boundry that enables correct snippet in each region. #35 and #36.

### 0.3.2 | 2017-02-10

- Allow single quote for lang attr. #31.

### 0.3.1 | 2017-02-04

- Mark sass and stylus region so linting is disabled on them. #25.

### 0.3.0 | 2017-02-01

- Error-checking / linting for css/scss/less/js. #16 and #24.

### 0.2.2 | 2017-02-01

- Fix comment-toggling for embedded language. #18.

### 0.2.1 | 2017-01-16

- Adopt YAML for editing tmLanguage.
- Fix syntax highlighting for TS. #19.

### 0.2.0 | 2017-01-03

- Language server based on VSCode's html extension. #2.
- Basic SCSS and LESS language features.

### 0.1.2 | 2016-12-19

- Allow `pug` as an alternative to `jade` in template. #9.

### 0.1.1 | 2016-12-18

- Fix ternary operator syntax highlighting. #3 and #11.

### 0.1 | 2016-11-06

Initial release, including:

- Syntax highlighting for:
  - html/jade
  - css/sass/scss/less/stylus
  - js/ts
- emmet for `<template>`
