- Start Date: 2020-10-14
- Target Major Version: 2.x & 3.x
- Reference Issues: https://github.com/vuejs/vetur/issues/815, https://github.com/vuejs/vetur/issues/424, https://github.com/vuejs/vetur/issues/873, https://github.com/vuejs/vetur/issues/1360, https://github.com/vuejs/vetur/issues/2016
- Implementation PR: (leave this empty)

# Summery
How to achieve monorepo, sub-folders, multi-repos support?

# Basic example
a configuration in `vetur.config.js`.
Ref: https://github.com/vuejs/vetur/pull/2378

# Motivation
- This feature request is very popular.
- Monorepo is a trend in the front-end world.
- There are several ways to implement this feature.
- Attempts to resolve difficulties encountered by non-configurable users

# Detailed design

## Noun
- Vetur: a VSCode extension for Vue support.
- VTI: a CLI for Vue file type-check, diagnostics or some feature.
- VLS: vue language server, The core of everything. It is base on [language server protocol](https://microsoft.github.io/language-server-protocol/).
- LSP: [language server protocol](https://microsoft.github.io/language-server-protocol/)
- LSP server: In this rfcs, It means VLS.
- LSP client: Connect to the client for the LSP server.
- TLS: TypeScript language service, **It isn't base on LSP**. We call function like lib to used it. It provide language functionality on a project. Like: hover, completion.
- TS plugin: TypeScript Language Service Plugin. We can use it for rename, refactor features. [ref](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)

## How it achieve ?
Three possible methods are summarized below.
I'm going to try to sort out the known strengths and weaknesses.

Ref: https://github.com/microsoft/vscode/wiki/Adopting-Multi-Root-Workspace-APIs#language-client--language-server
Example: https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-multi-server-sample
Similar PR: https://github.com/vuejs/vetur/pull/1928

### Multiple LSP client
We use configuration to open multiple LSP clients.
This will open multiple LSP server(VLS).
One project scope per VLS dedicated service.

#### Benefits
- simple and easy
- Because each server has its own process, it does not interfere with performance.
- Keep VLS simple

#### Drawbacks
- Each third-party client requires its own maintenance this logic.
- More computer resources required
- Because the TS plugin has a different runtime unit, VLS and TS plugin communication is a problem, May need to deal with unexpected situations.
- Information could not be shared before the project.

### Base on TLS in LSP server
The TypeScript is support multile project in one server.
It will make one Project to one TLS.
It is based on `tsconfig.json` location.
Because only TypeScript/JavaScript feature needs this feature at the moment,

Example: https://github.com/angular/vscode-ng-language-service
PS. In this example from angular, Slightly different is that the project relies entirely on TS plugins.
Similar PR: https://github.com/vuejs/vetur/pull/1734

#### Benefits
- Simply extend TypeScript support part.
- Consistent with the implementation of VSCode.
- Consistent with the implementation of TS plugin, VLS and TS plugin communication is not a problem.

#### Drawbacks
- It may create something completely unnecessary TLS when having project no Vue, maybe need a lazy logic?
- In the vue ecosystem, it isn't support multiple `tsconfig.json`, It's a little redundant. [more info](https://github.com/vuejs/vetur/blob/vetur-config-file-rfc/rfcs/001-vetur-config-file.md#why-isnt-array)
- Performance is affected by the interplay between projects. unless the separation process is implemented with node `worker_threads`.
- ~~The template interpolation need to refactor and design~~, At least it's not a problem now. But I'm not sure if we'll break anything if we let Template interpolation have multiple files importing from each other.
- Because there is no defined project in VLS, register globally components could be inaccurate.


### Add multiple project support in LSP server
We implement this feature in the VLS.

#### Benefits
- least restrictive
- Best integrated effect

#### Drawbacks
- Development costs are unknown, Maybe `vetur.config.js` rfcs can reduce it.
- Need longer time.

## Final implementation
We don't want to put the blame on all the clients. so remove `Multiple LSP client` option.
Consider package.json and tsconfig.json issues, we will try to use `Add multiple project support in LSP server`.
Also works with `vetur.config.js` configuration file.

# Alternatives
Same as https://github.com/vuejs/vetur/blob/monorepo-rfc/rfcs/002-monorepo-support.md#how-it-achieve-

# Adoption strategy
- No breaking change
- Add a docker command for provide information when have problem
- Add monorepo and sub-folder docs
- Try to provide humane tips

# Unresolved questions
- Have any multiple `tsconfig.json` case for a Vue project?
- What to base a project on? Use `tsconfig.json`, `package.json`, or config in [RFC](https://github.com/vuejs/vetur/pull/2378)?
- Have any multiple `tsconfig.json` case for a other framework project? React? Angular?
