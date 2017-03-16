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

- Adopted YAML for editing tmLanguage.
- Fix syntax highlighting for TS. #19.

### 0.2.0 | 2017-01-03

- Language server based on VSCode's html extension. #2.
- Basic SCSS and LESS language features.

### 0.1.2 | 2016-12-19

Allow `pug` as an alternative to `jade` in template. #9.

### 0.1.1 | 2016-12-18

Fix ternary operator syntax highlighting. #3 and #11.

### 0.1 | 2016-11-06

Initial release, including:

- Syntax highlighting for:
  - html/jade
  - css/sass/scss/less/stylus
  - js/ts
- emmet for `<template>`