# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.5](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.1.4...@autoanki/cli@0.1.5) (2022-12-09)

**Note:** Version bump only for package @autoanki/cli

## [0.1.4](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.1.3...@autoanki/cli@0.1.4) (2022-11-30)

**Note:** Version bump only for package @autoanki/cli

## [0.1.3](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.1.2...@autoanki/cli@0.1.3) (2022-11-29)

### Bug Fixes

- **cli:** handle exception ([7837ba5](https://github.com/chenlijun99/autoanki/commit/7837ba53fdab8e3a248c6acbef57e005a3c1eda5))
- **cli:** readline was wrongly closed ([b035f4d](https://github.com/chenlijun99/autoanki/commit/b035f4d27da6687ad25c76356de0cf1fdfd71c50))
- **config:** reject incomplete configuration ([37f36d1](https://github.com/chenlijun99/autoanki/commit/37f36d1ab2657e6d6f203d7a5fb03be165cb2a8e))
- **sync:** handle class name minification and correctly validate config schema ([8b6174b](https://github.com/chenlijun99/autoanki/commit/8b6174b31b2321bc97653b09fd326ebade0189ee))

## [0.1.2](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.1.1...@autoanki/cli@0.1.2) (2022-11-29)

### Code Refactoring

- **config:** drastic changes ([c825856](https://github.com/chenlijun99/autoanki/commit/c8258566e1354c8959135543c659eb9e09bba79c))

### Features

- **sync:** allow default choices to be configured for manual actions ([3a1d35a](https://github.com/chenlijun99/autoanki/commit/3a1d35ab5c0bdb05c96eaa940b16e295e7ffefab))

### BREAKING CHANGES

- **config:** some fields in the configuration have been renamed
  ("files" -> "inputs")

## [0.1.1](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.1.0...@autoanki/cli@0.1.1) (2022-11-21)

### Bug Fixes

- cli `print` command was broken after dd5818332064f3c5c4c062bd0178110929004b42 ([37364ef](https://github.com/chenlijun99/autoanki/commit/37364ef94f9de60e5eefcfc9b40d9fecd1a1a329))

### Code Refactoring

- drastically changed how media files are handled ([dd58183](https://github.com/chenlijun99/autoanki/commit/dd5818332064f3c5c4c062bd0178110929004b42))

### Features

- re-engineer configuration system ([e4e9d16](https://github.com/chenlijun99/autoanki/commit/e4e9d161b3f61b341d0f6f3fd3bd7e92bb1d2f06))
- support rendering PDFs inside Autoanki notes ([08c602c](https://github.com/chenlijun99/autoanki/commit/08c602cb836c647c3b2b47daeea84e4a89c73674))

### Performance Improvements

- **logging:** provide lazy logging primitives and use them ([4f419f5](https://github.com/chenlijun99/autoanki/commit/4f419f55ddd301839a7dfefae54f81e4b429ce68))

### BREAKING CHANGES

- nothing anybody would care, I should by the only user
  now... Anyway, yeah, the configuration system has been rewritten.
  Of course, the documentation is not there yet...
- plugins' constructor signature changed

# [0.1.0](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.5...@autoanki/cli@0.1.0) (2022-11-14)

**Note:** Version bump only for package @autoanki/cli

## [0.0.7](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.5...@autoanki/cli@0.0.7) (2022-11-14)

**Note:** Version bump only for package @autoanki/cli

## [0.0.6](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.5...@autoanki/cli@0.0.6) (2022-11-14)

**Note:** Version bump only for package @autoanki/cli

## [0.0.5](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.4-next.1...@autoanki/cli@0.0.5) (2022-11-14)

### Features

- **all:** sync is roughly working ([f4cd7ec](https://github.com/chenlijun99/autoanki/commit/f4cd7ec4b4a36e5ef936612b913e7aef77308ef9))

## [0.0.4](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.4-next.1...@autoanki/cli@0.0.4) (2022-11-14)

### Features

- **all:** sync is roughly working ([f4cd7ec](https://github.com/chenlijun99/autoanki/commit/f4cd7ec4b4a36e5ef936612b913e7aef77308ef9))

## [0.0.4-next.1](https://github.com/chenlijun99/autoanki/compare/@autoanki/cli@0.0.4-next.0...@autoanki/cli@0.0.4-next.1) (2021-05-16)

**Note:** Version bump only for package @autoanki/cli

## 0.0.4-next.0 (2021-05-16)

### Features

- **cli:** setup @autoanki/cli package ([6a965c2](https://github.com/chenlijun99/autoanki/commit/6a965c27bd49c93745a8fdccf34d5f2c61b7f2d6))
