# FAQ

## No Syntax Highlighting & No Language Features working

This is probably caused by VS Code not installing Vetur properly. Try these methods:

- Run command: `Developer: Reinstall Extension` for Vetur.
- Remove Vetur in your [extensions folder](https://code.visualstudio.com/docs/editor/extension-gallery#_common-questions) and do a clean reinstall.
- (Windows): Try reinstall Vetur with admin permission.
- If nothing above works, download the [latest pre-packaged vsix file](https://github.com/vuejs/vetur/releases) and [install through vsix](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

## Vetur Crash

- If it says `cannot find module <some-module>`, go to Vetur's client code installation directory and run `yarn` or `npm install`.
  This is usually caused by VS Code not correctly updating Vetur's dependencies from version to version.
  Paths:
  - Win: `%USERPROFILE%\.vscode\extensions\octref.vetur-<version>\client`
  - Mac: `~/.vscode/extensions/octref.vetur-<version>/client`
  - Linux: `~/.vscode/extensions/octref.vetur-<version>/client`

  You can also try uninstall/reinstall Vetur.  
  More details at: https://github.com/vuejs/vetur/issues/352#issuecomment-318168811

- If it says problem related to memory and cpu, try to add a `jsconfig.json` or `tsconfig.json` and only include Vue-related code: https://vuejs.github.io/vetur/setup.html

## Vetur can't recognize components imported using webpack's alias

- You need to setup path mapping in `jsconfig.json` or `tsconfig.json`: https://www.typescriptlang.org/docs/handbook/module-resolution.html. For example:

  ```js
  // Webpack
  module.exports = {
    resolve: {
      alias: {
        '@': 'src'
      }
    }
  }
  ```

  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": [
          "src/*"
        ]
      }
    }
  }
  ```

- You need to add `.vue` extension when importing SFC.

More details at: https://github.com/vuejs/vetur/issues/423

## .vue file cannot be imported in TS file.

You need to add `declare module '*.vue'` in your dts files: https://github.com/Microsoft/TypeScript-Vue-Starter#single-file-components.

## Formatting doesn't work in template section.

Vetur by default does **not** format html.  
See https://github.com/vuejs/vetur/blob/master/CHANGELOG.md#vetur-formatting-changes for more detail.

If template still gets no formatting after enabling js-beautify, it is probably caused by [prettier-vscode](https://github.com/prettier/prettier-vscode) extension.  
You can disable it for Vue: https://github.com/prettier/prettier-vscode#prettierdisablelanguages-default-

## Install from source.

To build and install the extension from source, you need to install [`vsce`](https://code.visualstudio.com/docs/extensions/publish-extension).

Then, clone the repository and compile it.

```
git clone https://github.com/vuejs/vetur
cd vetur
yarn 
cd server && yarn && yarn compile 
cd ../ && yarn compile 
vsce package
```
  
Now you'll find `vetur-{version}.vsix`, you can install it by editor command "Install from VSIX".
