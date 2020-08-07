# No Repro Case Issues

You are here because your issue is closed with `no-repro-case` tag. Please read below and open a new issue with repro case.

## What is a repro case?

Repro case, short for *reproducible case*, refers to a minimal example that demonstrates the problem.

Good repro cases help maintainers a lot:

1. They can be reproduced and debugged in maintainers' setup.
2. They demonstrate a singular bug in a simple setting, so it's easy to find the cause.

Writing a good repro case helps *you* as well. In the process of reducing your question to the simplest form, you communicate more clearly, gain deeper understanding of the problem, and sometimes even figure out the cause of the bug yourself.

## How to create a repro case?

Read Stack Overflow's guide to writing a [Minimal, Reproducible Example](https://stackoverflow.com/help/minimal-reproducible-example), if you haven't.

In the case of Vetur:

- Clone https://github.com/octref/veturpack and install its dependencies
- Make a minimal code change to demonstrate your problem
- Push your commit to a fork
- Include link to the fork in the issue

**Note: Turn off all other Vue extensions. If your issue is about a Vetur setting, turn off all other Vetur settings and only change the setting which is causing issue.**