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

#### Code Dev Guide

```bash
$ cd server && yarn && npm run compile
$ cd client && yarn
```

Then `F5` with `all` target to start debugging.

#### Grammar Dev Guide

- Open the yaml files in `/syntax` with Sublime Text
- Install [PackageDev](https://github.com/SublimeText/PackageDev) if you haven't
- F7 to compile yaml grammar to tmLanguage files
- Run the `client` debug target in vetur project root

> Tip: In VSCode, use F1 -> Inspect TM Scopes:

![scope](https://github.com/octref/vetur/blob/master/asset/scope.png)

## Doc

PR that fixes grammar & typo or clarify & illustrate usage is welcome.

## Issues

- Answer other people's questions
- Make & ask for repro cases