# No Repro Case Issues

You are here because your issue is closed with `no-repro-case` tag. Please read below and open a new issue with repro case.

## What is a repro case?

Repro case, short for *reproducible case*, refers to a minimal example that demonstrates the problem.

Good repro cases help maintainers a lot:

1. They can be reproduced and debugged in maintainers' setup.
2. They demonstrate a singular bug in a simple setting, so it's easy to reason about the cause of the bug.

Often times, writing a good repro case helps *you* as well. In the process of reducing your question to the simplest form, you communicate more clearly, gain deeper understanding of the problem, and even figure out the cause of the bug yourself.

## How to find a repro case?

Stack Overflow's guide to writing a [Minimal, Reproducible Example](https://stackoverflow.com/help/minimal-reproducible-example) is worth reading.

In the case of Vetur:

- Clone https://github.com/octref/veturpack and install its dependencies
- Open it in Vetur
- Turn off all Vetur settings
- Turn off all other Vue extensions
- Make the minimal setting change or code change that can demonstrate your problem
- Push your commit to a fork
- Include the fork in the issue

