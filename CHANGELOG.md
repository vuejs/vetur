# Changelog

### 0.12.6 | 2018-08-06

- Revert embedded pug languageId to jade, so Cmd+/ uses `//-` for comment. Fix #840.
- Fix syntax highlight for `:snake_case` properties in HTML. Thanks to contribution from [@davidhewitt](https://github.com/davidhewitt). #830.
- Auto completion for [Buefy](https://buefy.github.io) framework. Thanks to contribution from [@jtommy](https://github.com/jtommy). #824.
- Fix description for `v-cloak`. Thanks to contribution by [@snkashis](https://github.com/snkashis). #816.

### 0.12.5 | 2018-06-06

- Use `source.js#expression` for Vue interpolation values. Fix #811 and #804
- Fix a pug syntax highlighting issue. #812

### 0.12.4 | 2018-06-05

- Improved file watching that updates completion and diagnostics in Vue files when TS/JS file changes. #355

### 0.12.3 | 2018-05-17

- Removed chokidar watcher.

### 0.12.2 | 2018-05-17

- Temporarily disable file watcher for perf problem & will bring it back in next version. #789.

### 0.12.1 | 2018-05-14

- Haml syntax highlighting. #739.
- Remove restricted file schemes for live share.
- Fix an issue where Vetur failed to read emmet configs and cause emmet and other completions to fail.

### 0.11.8 | 2018-05-14

- Update TypeScript Version to allow usage of `!` for definite assignment assertions.
- Add single quote as trigger character. Fix #743
- Add `arrowParens` option for Prettier
- Upgrade vscode-emmet-helper. Fix #412. Fix #426
- Add `vetur.completion.useScaffoldSnippets`. Fix #698
- Skip template completion trigger in script. Fix #705
- Fix script definition lookup position error. Fix #741
- Add a crude file watcher. Now Vetur will pick up text change in TS/JS. Note this feature is experimental. Partially fix #355

### 0.11.7 | 2018-01-28

- Better default scaffold template for TypeScript. #669.
- Partial support for quoteless attribute value in HTML5. #648.
- Fix a grammar error for custom blocks. #664.
- Mark the `/` as `tag.end.html` in self-closing component. #650.
- Fix a Stylus formatting issue where it adds extra parentheses. #638.

### 0.11.6 | 2018-01-16

- Basic Vuetify completion. #647.
- Add auto import. #606.
- Optimize vsix size to reduce bundle size by 33%.
- Only read parser option for using prettier for script section. #574.
- Fix syntax highlighting for single line, self-closing template/style/script. #591.
- Fix "Language client is not ready yet" error. #576.
- Fix dulplicate bracket in scaffold completion. #367.

### 0.11.5 | 2017-12-15

- Fix an error incorrectly reporting `<template>` should have end tag. #578.
- Change Vetur's template linting to use [`essential`](https://github.com/vuejs/eslint-plugin-vue#priority-a-essential-error-prevention) instead of [`recommended`](https://github.com/vuejs/eslint-plugin-vue#priority-c-recommended-minimizing-arbitrary-choices-and-cognitive-overhead) rule set of `eslint-plugin-vue`. #579.
- Nicer display of diagnostic error from `eslint-plugin-vue`.

### 0.11.4 | 2017-12-14

- Upgrade to latest prettier & prettier-eslint.
- Upgrade to latest vscode-css-languageservice that has css grid support. #437.
- Upgrade to latest eslint-plugin-vue.
  - Fix an error reporting "v-model directives don't support dynamic input types. #554.
  - Fix an error reporting "`key` must not be allowed in `<slot>`". #505.
- Include `/server` in distribution instead of downloading from NPM to a different location. Fix a issue where VS Code has trouble finding the Language Server. #568.
- Color Picker support. #559.
- Fix a bug with imprecise find definition. #549.
- Fix a vue-html grammar rule that does not highlight Vue templates after `</template>`. #548.
- Upgrade grammar so broken syntax in each region will not affect syntax highlighting outside that specific region. #174.
- Always ignore `end_with_newline` option in js-beautify so the template formats properly. #544.


### 0.11.3 | 2017-11-13 

- Hot fix for a bug in formatting `<template>` with js-beautify where it adds `</template>` to the end. #539.

### 0.11.2 | 2017-11-13 

- Workaround a js-beautify bug which indents multi-line comment. #535.
- Docs for generating grammar for custom blocks: https://vuejs.github.io/vetur/highlighting.html.
- Allow `php` as one of the custom block language. #536.
- Disallow longer version of `lang` in custom block setting (`js` over `javascript`, `md` over `markdown`).
- Pretty print generated gramamr so it's readable. (You can find it at ~/.vscode/extensions/octref.vetur-<version>./syntaxes/vue-generated.json).

### 0.11.1 | 2017-11-10 

- Syntax highlighting for Custom Block. #210.
  - Added setting `vetur.grammar.customBlocks`.
  - Added command "Vetur: Generate grammar from `vetur.grammar.customBlocks`".

### 0.11.0 | 2017-11-06

- Better completion order in js/ts. #489.
- Fix some Stylus formatting issues. #471.
- prettier-eslint support. #478.
- Fix Vetur not correctly distinguishing js/ts regions. #504 and #476.
- Fix a bug where Vetur misses completion item details. #418.
- Prefer user jsconfig/tsconfig compilerOptions in Vue Language Server. #515 and #512.

### 0.10.1 | 2017-10-19

- Remove range formatter. #100.
- Remove onTypeFormat. #477.
- Upgrade TypeScript for better large workspace handling. #390.

### 0.10.0 | 2017-10-19

- :red_circle: Breaking change in `vetur.format.*` setting. See details below.
- Prettier as default formatter for css/scss/less/js/ts. #221.
- Load Vue dependency even if it's a `devDependency` to provide IntelliSense. #470.
- Updated IntelliSense for Vue tags change in 2.5.
- Disable non-functional postcss error-checking, since vscode-css-languageservice does not support it. #465.

#### Vetur Formatting Changes

See updated docs at: https://vuejs.github.io/vetur/formatting.html

- Vetur now uses prettier for formatting css/scss/less/js/ts.
- Vetur plans to use prettier for html formatting when it lands in prettier. Upstream issues [prettier/prettier#1882](https://github.com/prettier/prettier/issues/1882) [prettier/prettier#2097](https://github.com/prettier/prettier/issues/2097)
- `vetur.format.defaultFormatter` now allows you to set formatter based on language. The current default is:

  ```json
  "vetur.format.defaultFormatter": {
    "html": "none",
    "css": "prettier",
    "postcss": "prettier",
    "scss": "prettier",
    "less": "prettier",
    "js": "prettier",
    "ts": "prettier",
    "stylus": "stylus-supremacy"
  }
  ```

- Vetur now disables html formatting with js-beautify by default and plans to completely remove js-beautify once html support lands in prettier. You can still enable it by setting:

  ```json
  "vetur.format.defaultFormatter": {
    "html": "js-beautify-html"
  },
  "vetur.format.defaultFormatterOptions": {
    "js-beautify-html": {
      // js-beautify-html settings, see https://github.com/vuejs/vetur/blob/master/server/src/modes/template/services/htmlFormat.ts
    }
  }
  ```

- Vetur will close all html formatting issues. js-beautify issues should be reported to js-beautify. Our team will direct effort to build html / vue formatting in prettier.

### 0.9.11 | 2017-10-09

- Stylus formatter based on [Stylus Supremacy](https://thisismanta.github.io/stylus-supremacy/). Thanks to [@ThisIsManta](https://github.com/ThisIsManta)'s contribution. #457.
- Fix a bug where one-line tags with `src` could corrupt linting. #461.
- Region support for `<template>`, `<style>` and `<script>`. #459.

### 0.9.10 | 2017-09-22

- Fix Enter key not working correctly due to formatOnType. #448.

### 0.9.9 | 2017-09-21

- Fix a template highlight issue. #440.

### 0.9.8 | 2017-09-21

- Fix `this.$` completion.
- Support Vue 2.5+ types. #435.
- [bootstrap-vue](https://bootstrap-vue.js.org/) support. Thanks to [@alexsasharegan](https://github.com/alexsasharegan). #428.
- formatOnType support. #431.
- Make `editor.emmet.action.expandAbbreviation` available in `vue-html` region, so old-style emmet is usable.
- Upgrade Element UI and Onsen UI auto-completion tags & attributes.

### 0.9.7 | 2017-09-08

- Upgrade to newest TypeScript version with support for JSDoc cast and more. #419 and #420.
- Hotfix for the disappearing formatter. #421.

### 0.9.6 | 2017-09-07

- Handle unquoted attr values. #341.
- Exclude files based on gitignore file by default. #418.
- Fix opening single Vue file without workspace perf issue. #348.
- More tolerant parsing for template region, so IntelliSense would be available even when template is invalid. #413.
- Find Definition for Vue components in `<template>`. #411.
- Completion for component name and props in `<template>`. #393.
- Fix emmet not showing suggestions correctly for items with `-`. #398.
- Fix an ESLint error handling nested v-for. #400.

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
- Move `files.associations` setup in README, as vue file is not associated with html by default in VS Code.

### 0.4.0 | 2017-02-27

- Port new changes from VS Code's html extension, which fixes
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
- Remove vue-js and use VS Code's javascript grammar.

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

- Language server based on VS Code's html extension. #2.
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
