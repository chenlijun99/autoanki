# @autoanki/config

The whole Autoanki system was designed to be flexibility. With flexibility comes configuration complexity and the goal of this module is to define and implement an (arguably opinionated) way for users to provide configuration for @autoanki packages.

## Who should be interested in this package

- Developers who what to develop applications on top of the @autoanki packages and who don't want to roll their own configuration system.

## Design

- The design goals of a configuration system for autoanki are somewhat similar to the one of a famous linter in the JavaScript ecosystem, [eslint](https://eslint.org/).
  - Also the configuration system for autoanki should allow users to:
    - Share common configuration for many files.
    - Allow configuration to be inherited and overridden in a flexible manner.
  - We take the [lessons that the eslint developers learnt](https://eslint.org/blog/2022/08/new-config-system-part-1/) and start right away with a flat configuration approach.
