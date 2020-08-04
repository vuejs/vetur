# Contribution Guide

Contribution is welcome! There are many ways you could help Vetur's development:

- [Writing Code](#code)
- [Improving Doc](#doc)
- [Triaging Issues](#issues)

## Code

- **When issue is complex, comment on feature requests first to get feedback and implementation pointers before sending PR.**
- **Tick _[Allow Edits from Maintainers](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork)_**

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
yarn compile
# or yarn watch
```

To debug:

- The extension has a compound debug configuration named `all`. Run it.
- In the newly opened window, open a Vue project such as [veturpack](https://github.com/octref/veturpack).
- Open a Vue file — this will activate Vue Langauge Server.

It should look like this (notice the server/client under `CALL STACK`):

![VS Code Debugging](https://raw.githubusercontent.com/vuejs/vetur/master/docs/images/debug.png)

**`vetur.dev.vlsPath`**

You can use this setting to make Vetur load a development version of `vls`. Some use cases:

- You fixed a bug in Vetur, but the PR is pending and won't be published anytime soon.
- You want to use TS 3.1, but Vetur bundles TS 2.8.
- You are contributing to Vetur, and would run alpha/beta/RC versions in your daily development to provide feedback and find bugs.

Two ways of using it:

1. `yarn global add vls` and point the setting to `yarn global dir` + `node_modules/vls`
2. Clone this repo, build it and point it to the ABSOLUTE path of `/server`

#### Grammar Dev Guide

- Open the yaml files in `/syntax`
- After editing use either `yarn build:grammar` or `npm run build:grammar` to build the json files
- If you changed the `vue.yaml` file, be sure to run the `vetur.generateGrammar` command from the vscode command palette

> Tip: In VS Code, use F1 -> Inspect TM Scopes to view language scopes to debug the grammar:

![scope](https://raw.githubusercontent.com/vuejs/vetur/master/docs/images/scope.png)

After you are done, verify the grammar integration test passes by running `yarn test:grammar`.

If a file `test/grammar/results/<FILE>_vue.json` exists, the testing script will compare the actual tokenization result
of tokenizing `test/grammar/fixture/<FILE>.vue` against the JSON.

If `test/grammar/fixture/<FILE>.vue` exists but no corresponding JSON file exists, the script will generate a new JSON file. So:

- If you are adding a new test, add a file `test/grammar/fixture/<FILE>.vue` and run the test script to generate a corresponding JSON file. Commit both.
- If you see a test failure but you verify the color looks correct when running the `client` debug target, delete the JSON file and run the test script to generate a new one. Compare the diff and commit the changes.

## Doc

PR that fixes grammar/typo or clarify usage is welcome.

## Issues

See https://github.com/vuejs/vetur/wiki/Triaging-Issues
