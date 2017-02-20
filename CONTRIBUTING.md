# Contribution Guide

Vetur is still in heavy development. I don't think it's ready for taking external contribution.  
However, I'll list the way you can run & debug the extension. This might be helpful if you are
tweaking grammar or developing a VSCode language server.

You are welcome to open issues for feature request or bug report.  
**Please use English for communication.**

## Prerequisite

```bash
$ cd server && npm install && npm run compile
$ cd client && npm install
```

## Grammar

- Open the yaml files in `/syntax` with Sublime Text
- Install [PackageDev](https://github.com/SublimeText/PackageDev) if you haven't
- F7 to compile yaml grammar to tmLanguage files
- Run the `client` debug target in vetur project root

### Tip: Inspecting Scopes

In VSCode, use F1 -> Inspect TM Scopes:

![scope](https://github.com/octref/vetur/blob/master/asset/scope.png)

## Language Client & Server

- After running the prerequisite, you should have the server compiled and installed to `/client`
- Run the `client` debug target. This should open a new VSCode window
- Change the debug target to `server` and run it. This should attach the process to the running server (VSCode's multi-target debugging feature)
- Set breakpoints in `/server/src` or `/client/src` and debug away!
