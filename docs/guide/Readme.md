# Quick start

Here are five common use cases.

- [Vue CLI](#vue-cli)
- [Veturpack]($veturpack)
- [Laravel](#laravel-custom-project)
- [Custom project](#laravel-custom-project)
- [Monorepo](#monorepo)

## Vue CLI
[Offical Website](https://cli.vuejs.org/)   
When you create project with Vue CLI,   
If you are not using typescript, please add `jsconfig.json` at opened project root.
```json
{
  "compilerOptions": {
    "target": "es2015",
    "module": "esnext",
    "baseUrl": "./",
    "paths": {
      "@/*": ["components/*"]
    }
  },
  "include": [
    "src/**/*.vue",
    "src/**/*.js"
  ]
}
```
[Add shim-types file for import Vue SFC in typescript file.](/guide/setup.md#typescript)

If you use typescript, you don't need to do anything in your project.

## Veturpack
[Github](https://github.com/octref/veturpack)   
It works out of the box.

## Laravel / Custom project
Please keep `package.json` and `tsconfig.json`/`jsconfig.json` at opened project root.   
If you can't do it, please add `vetur.config.js` for set config file path.   
[Add shim-types file for import Vue SFC in typescript file.](/guide/setup.md#typescript)

- [Read more `tsconfig.json`/`jsconfig.json`](/guide/setup.md#project-setup).
- [Read more `vetur.config.js` doc](/guide/setup.md#advanced).

## Monorepo
Please add `vetur.config.js` for define projects.

- [Read more `vetur.config.js` doc](/guide/setup.md#advanced).
