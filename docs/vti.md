# VTI

🚧 WIP. This feature is not stable yet. 🚧

VTI (Vetur Terminal Interface) is a CLI that exposes some of Vetur's language features:

- [x] Diagnostic errors
- [ ] Formatting

## Usage

```bash
npm i -g vti
# run this in the root of a Vue project
vti
vti diagnostics
```

![VTI demo](https://user-images.githubusercontent.com/4033249/72225084-911ef580-3581-11ea-9943-e7165126ace9.gif).

Currently, this is only used for generating interpolation type-checking errors on CLI, which
neither Vue's compiler nor Webpack would catch.

Please send feedback to: https://github.com/vuejs/vetur/issues/1635.
