# Contribution Guide

Contribution is welcome! There are many ways you could help Vetur's development:

- Writing Code
- Improving Doc
- Managing Issues

## Code

Comment on feature requests that you'd like to contribute before sending PR.

#### Coding Style

- Prettier with 120 print-width
- TSLint
- `const` over `let` whenever possible

#### Code Dev Guide

Vetur consists of 2 parts

- Language Client as a normal VS Code extension
- Vue Language Server

The language client launches Vue Language Server on port 6005 whenever a Vue file is opened.

To compile:

```bash
yarn
cd server && yarn && cd ..
yarn compile
# or yarn watch
```

To debug:

- The extension has 2 configurations for debugging i.e client and server. 
- Run the client configuration first. 
- As the client launches the language server lazily, open any .vue file so that the server is started. 
- Run the server configuration which binds the server code to port 6005 to enable debugging.
- At this point breakpoints in both server and client code should work. 
- Alternatively, you can run the 'all' compound debug config too. You need to make sure to open a .vue file within 10 seconds so the server can be started and attached to

It should look like this:

![VS Code Debugging](https://raw.githubusercontent.com/vuejs/vetur/master/docs/images/debug.png)

**`vetur.dev.vlsPath`**

You can use this setting to make Vetur load a development version of `vue-language-server`. Some use cases:

- You fixed a bug in Vetur, but the PR is pending and won't be published anytime soon.
- You want to use TS 3.1, but Vetur bundles TS 2.8.
- You are contributing to Vetur, and would run alpha/beta/RC versions in your daily development to provide feedback and find bugs.

Two ways of using it:

1. `yarn global add vue-language-server` and point the setting to `yarn global dir` + `node_modules/vue-language-server`
2. Clone this repo, build it and point it to the ABSOLUTE path of `/server`

#### Grammar Dev Guide

- Open the yaml files in `/syntax`
- After editing use either `yarn build:grammar` or `npm run build:grammar` to build the json files
- If you changed the `vue.yaml` file, be sure to run the `vetur.generateGrammar` command from the vscode command palette

> Tip: In VS Code, use F1 -> Inspect TM Scopes to view language scopes to debug the grammar:

![scope](https://raw.githubusercontent.com/vuejs/vetur/master/docs/images/scope.png)

## Doc

PR that fixes grammar & typo or clarify & illustrate usage is welcome.

## Issues

- Answer other people's questions
- Make & ask for repro cases
