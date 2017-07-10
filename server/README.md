## Vue Language Server

Vue Language Server is a standalone server implementation for editors.


## Usage

There is two ways to integrate VLS into editors.

1) as global executable.

Example Client: https://github.com/autozimu/LanguageClient-neovim

First, install VLS globally.

```bash
npm install vue-language-server -g
```

This will provide you the global `vls` command.

Then, configure LanguageClient to use `vls`. In this example, we write below configuration into `init.vim`.


```vim
let g:LanguageClient_serverCommands = {
    \ 'vue': ['vls']
    \ }
```


2) as plugin dependency.

Example: https://github.com/HerringtonDarkholme/atom-vue

First, install vue-language-server as a local dependency.

```bash
npm install vue-language-server --save
```

Then, require the vue-language-server, this would typically look like:

```ts
class VueLanguageClient extends AutoLanguageClient {
  startServerProcess () {
    return cp.spawn('node', [require.resolve('vue-language-server/dist/htmlServerMain')])
  }
}
```

Your mileage might vary, but the basic idea is roughly the same.

## License

MIT
