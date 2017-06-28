# Linting / Error Checking

Vetur provides error-checking and linting.

## Linting

Install [ESLint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for the best linting experience. Vetur's template linting is only for quick start and does not support rule configuration.

#### Linting for `<template>`

Vetur automatically uses `eslint-plugin-vue@beta` for linting `<template>`. Linting configuration is based on eslint-plugin-vue's recommended rule set.

To turn it off, set `vetur.validation.template: false`.

To configure linting rules, turn off vetur's template validation and install `eslint` and `eslint-plugin-vue@beta` locally as `devDependencies`, and set ESLint rules in `.eslintrc`.

## [To Write]

- ESLint for script
- TSLint
