# Syntax Highlighting

Vetur supports syntax highlighting for the following languages:

|syntax|lang|
|---|---|
|`<template>`|`html`|
|`<template lang="pug">`|`pug`|
|`<template lang="jade">`|`pug`|
|`<template lang="slm">`|`slm`|
|`<style>`|`css`|
|`<style lang="postcss">`|`postcss`|
|`<style lang="scss">`|`scss`|
|`<style lang="sass">`|`sass`|
|`<style lang="less">`|`less`|
|`<style lang="stylus">`|`stylus`|
|`<script>`|`js`|
|`<script lang="ts">`|`ts`|
|`<script lang="coffee">`|`coffee`|

## Custom Block

Vetur provides a setting `vetur.grammar.customBlocks` that defaults to:

```json
  "vetur.grammar.customBlocks": {
    "docs": "md",
    "i18n": "json"
  }
```

You can
  - change `vetur.grammar.customBlocks`
  - run the command "Vetur: Generate grammar from `vetur.grammar.customBlocks`" 
  - restart VS Code
to get syntax highlighting for custom blocks.

Valid language value for custom blocks:

- All `lang` values in the support table.
- `md | yaml | json | php`
