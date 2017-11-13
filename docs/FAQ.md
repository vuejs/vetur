# FAQ

## Vetur Crash

- If it says `cannot find module <some-module>`, go to Vetur's client code installation directory and run `yarn` or `npm install`.
  This is usually caused by VS Code not correctly updating Vetur's dependencies from version to version.
  Paths:
  - Win: `%USERPROFILE%\.vscode\extensions\octref.vetur-<version>\client`
  - Mac: `~/.vscode/extensions/octref.vetur-<version>/client`
  - Linux: `~/.vscode/extensions/octref.vetur-<version>/client`

  More details at: https://github.com/vuejs/vetur/issues/352#issuecomment-318168811

- If it says problem related to memory and cpu, try to add a `jsconfig.json` or `tsconfig.json` and only include Vue-related code: https://vuejs.github.io/vetur/setup.html

## Vetur can't recognize components imported via absolute path.

- You need to setup path mapping in `jsconfig.json` or `tsconfig.json`: https://www.typescriptlang.org/docs/handbook/module-resolution.html.
- You need to add `.vue` extension when importing SFC.

More details at: https://github.com/vuejs/vetur/issues/423

## .vue file cannot be imported in TS file.

You need to add `declare module '*.vue'` in your dts files: https://github.com/Microsoft/TypeScript-Vue-Starter#single-file-components.