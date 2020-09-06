# FAQ

## Install an old version of Vetur

Sometimes new releases have bugs that you want to avoid. Here's an easy way to downgrade Vetur to a working version:

- Set `"extensions.autoUpdate": false`.
- Find the version you want and download VSIX https://github.com/vuejs/vetur/blob/master/CHANGELOG.md.
- Install VSIX following this guide: https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix.

## No Syntax Highlighting & No Language Features working

The two possible causes are:

1. Other extensions also contribute a Vue language, and that conflicts with Vetur.
2. VS Code didn't install Vetur properly.

For 1, try disabling all other Vue related extensions.

For 2, try these methods:

- Run command: `Developer: Reinstall Extension` for Vetur.
- Remove Vetur in your [extensions folder](https://code.visualstudio.com/docs/editor/extension-gallery#_common-questions) and do a clean reinstall.
- (Windows): Try removing & reinstall Vetur with admin privilege.
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

## Template errors in components written in Javascript

If you have `vetur.validation.interpolation` enabled and are getting a lot of "Property 'xxx' does not exist on type 'CombinedVueInstance'" errors, it might be due to Typescript not being able to infer types properly. In Javascript-based code base, Typescript does a lot of guessing to infer types properly but it's not always able to do that automatically. You might have to add type annotations manually in the script section. Read more about the issue here: [#1707 (comment)](https://github.com/vuejs/vetur/issues/1707#issuecomment-686851677). Also, check [how to add JSDoc annotations](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

## Vetur cannot recognize my Vue component import, such as `import Comp from './comp'`

- You need to add `.vue` extension when importing SFC.

More details at: https://github.com/vuejs/vetur/issues/423#issuecomment-340235722

## .vue file cannot be imported in TS file.

You need to add `declare module '*.vue'` in your dts files: https://github.com/Microsoft/TypeScript-Vue-Starter#single-file-components.

## Install from source.

To build and install the extension from source, you need to install [`vsce`](https://code.visualstudio.com/docs/extensions/publish-extension).

Then, clone the repository and compile it.

```
git clone https://github.com/vuejs/vetur
cd vetur
yarn
yarn compile
vsce package
```
  
Now you'll find `vetur-{version}.vsix`, you can install it by editor command "Install from VSIX".

## Vetur uses different version of TypeScript in .vue files to what I installed in `node_modules`.

You can enable `Vetur: Use Workspace Dependencies` setting so that it uses the same version of TypeScript in your workspace.
NB: It will use `typescript.tsdk` setting as the path to look for if defined, defaulting to `node_modules/typescript`. This enables tools like Yarn PnP to set their own custom resolver.
