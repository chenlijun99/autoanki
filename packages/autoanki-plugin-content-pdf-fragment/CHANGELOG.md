# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.8](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.7...@autoanki/plugin-content-pdf-fragment@0.1.8) (2023-01-01)

### Bug Fixes

- **plugin-content-pdf-fragment:** fine tune styling ([c34881a](https://github.com/chenlijun99/autoanki/commit/c34881abbce155205aa2a833f0bd9cf1208ba214))

### Features

- **plugin-content-pdf-fragment:** apply `viewrect` PDF open parameters only to first page ([2d50b01](https://github.com/chenlijun99/autoanki/commit/2d50b0102dc38be15ee05bd812669785cb7143aa))

## [0.1.7](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.6...@autoanki/plugin-content-pdf-fragment@0.1.7) (2022-12-31)

### Bug Fixes

- **plugin-content-pdf-fragment:** apply PDF open parameters only to first page ([4e60db1](https://github.com/chenlijun99/autoanki/commit/4e60db1322c205663cd4191197ee06e122cc6ae0))

## [0.1.6](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.5...@autoanki/plugin-content-pdf-fragment@0.1.6) (2022-12-12)

### Bug Fixes

- **plugin-content-pdf-fragment:** sometimes viewrect doesn't work ([56ded97](https://github.com/chenlijun99/autoanki/commit/56ded976b45e2af3c4fe72d3740dd12e9db6f445))

## [0.1.5](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.4...@autoanki/plugin-content-pdf-fragment@0.1.5) (2022-12-09)

### Bug Fixes

- **plugin-content-pdf-fragment:** fine tune #viewrect open parameter support ([5f2d676](https://github.com/chenlijun99/autoanki/commit/5f2d676fb32f7ef904be054bb946708675af54fd))

## [0.1.4](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.3...@autoanki/plugin-content-pdf-fragment@0.1.4) (2022-12-01)

### Bug Fixes

- **plugin-content-pdf-fragment:** only PDFs inside a single note were rendered ([277a7d1](https://github.com/chenlijun99/autoanki/commit/277a7d19ee3c19871278c088f3bafd2beac74e47))

## [0.1.3](https://github.com/chenlijun99/autoanki/compare/@autoanki/plugin-content-pdf-fragment@0.1.2...@autoanki/plugin-content-pdf-fragment@0.1.3) (2022-11-30)

### Features

- support media extraction from Zotero ([485c198](https://github.com/chenlijun99/autoanki/commit/485c1987859f09f33e5c7b93dc806f248d96df60))

## 0.1.2 (2022-11-29)

### Bug Fixes

- ignore complains of TypeScript ([12baa73](https://github.com/chenlijun99/autoanki/commit/12baa73f8c0978317ad6049de2879dce618b00bd))
- make esbuild work with emotion ([ba908b3](https://github.com/chenlijun99/autoanki/commit/ba908b3137463bfaecfa20df4f7a91583a110b5b))
- make typescript happy ([c55276b](https://github.com/chenlijun99/autoanki/commit/c55276b20a80f1e34f723f8a07d6a78c88317b0a))
- **plugin-content-pdf-fragment:** correctly handle rotated PDF ([eef5416](https://github.com/chenlijun99/autoanki/commit/eef54160db1f07cdc4cef920dcf680d59f8882b8))

### Code Refactoring

- **plugin-content-pdf-fragment:** use consistent package name ([3b5db62](https://github.com/chenlijun99/autoanki/commit/3b5db62b24dd0e38e7358da8fc124a1dad823106))

### Features

- **autoanki-plugin-content-pdf-fragment:** fine tune PDF rendering ([17e548c](https://github.com/chenlijun99/autoanki/commit/17e548c40886d6d97a9c9c7e21d18ac5fb69b92d))
- **pdf:** fine tune PDF rendering ([6f9ae11](https://github.com/chenlijun99/autoanki/commit/6f9ae11b8143d1d5e9ff358fd995987ed6c4f492))
- **pdf:** support legacy CJK PDFs and PDFs that require standard fonts ([2c8aae2](https://github.com/chenlijun99/autoanki/commit/2c8aae28e98e0fd907862347d49e58f18bdf14cc))
- **pdf:** support rendering PDFs on Anki-Android ([daa7382](https://github.com/chenlijun99/autoanki/commit/daa7382b7f620d06ac09cdceaf2aa7520e74454e))
- **plugin-content-pdf-fragment:** allow users to control PDF zoom when autoscaling is enabled ([21af853](https://github.com/chenlijun99/autoanki/commit/21af8539528b73d2a613cf48b24a53a829b43c84))
- **plugin-content-pdf-fragment:** more configurable PDF rendering ([480b6e2](https://github.com/chenlijun99/autoanki/commit/480b6e2ba4cb6662a507945f86b8bc24b23ddd93))
- support #page PDF open parameter ([379af29](https://github.com/chenlijun99/autoanki/commit/379af2927eee53df0bb8d007cda0813308c2c111))
- support rendering PDFs inside Autoanki notes ([08c602c](https://github.com/chenlijun99/autoanki/commit/08c602cb836c647c3b2b47daeea84e4a89c73674))

### BREAKING CHANGES

- **plugin-content-pdf-fragment:** the package name has been changed from
  `@autoanki/autoanki-plugin-content-pdf-fragment`
  to
  `@autoanki/plugin-content-pdf-fragment`.

## [0.1.1](https://github.com/chenlijun99/autoanki/compare/@autoanki/autoanki-plugin-content-pdf-fragment@0.1.0...@autoanki/autoanki-plugin-content-pdf-fragment@0.1.1) (2022-11-21)

### Bug Fixes

- ignore complains of TypeScript ([12baa73](https://github.com/chenlijun99/autoanki/commit/12baa73f8c0978317ad6049de2879dce618b00bd))
- make typescript happy ([c55276b](https://github.com/chenlijun99/autoanki/commit/c55276b20a80f1e34f723f8a07d6a78c88317b0a))

### Features

- **pdf:** fine tune PDF rendering ([6f9ae11](https://github.com/chenlijun99/autoanki/commit/6f9ae11b8143d1d5e9ff358fd995987ed6c4f492))
- **pdf:** support legacy CJK PDFs and PDFs that require standard fonts ([2c8aae2](https://github.com/chenlijun99/autoanki/commit/2c8aae28e98e0fd907862347d49e58f18bdf14cc))
- **pdf:** support rendering PDFs on Anki-Android ([daa7382](https://github.com/chenlijun99/autoanki/commit/daa7382b7f620d06ac09cdceaf2aa7520e74454e))
- support #page PDF open parameter ([379af29](https://github.com/chenlijun99/autoanki/commit/379af2927eee53df0bb8d007cda0813308c2c111))
- support rendering PDFs inside Autoanki notes ([08c602c](https://github.com/chenlijun99/autoanki/commit/08c602cb836c647c3b2b47daeea84e4a89c73674))

# [0.1.0](https://github.com/chenlijun99/autoanki/compare/@autoanki/autoanki-plugin-content-pdf-fragment@0.0.3...@autoanki/autoanki-plugin-content-pdf-fragment@0.1.0) (2022-11-14)

**Note:** Version bump only for package @autoanki/autoanki-plugin-content-pdf-fragment

## [0.0.5](https://github.com/chenlijun99/autoanki/compare/@autoanki/autoanki-plugin-content-pdf-fragment@0.0.3...@autoanki/autoanki-plugin-content-pdf-fragment@0.0.5) (2022-11-14)

**Note:** Version bump only for package @autoanki/autoanki-plugin-content-pdf-fragment

## [0.0.4](https://github.com/chenlijun99/autoanki/compare/@autoanki/autoanki-plugin-content-pdf-fragment@0.0.3...@autoanki/autoanki-plugin-content-pdf-fragment@0.0.4) (2022-11-14)

**Note:** Version bump only for package @autoanki/autoanki-plugin-content-pdf-fragment

## 0.0.3 (2022-11-14)

**Note:** Version bump only for package @autoanki/autoanki-plugin-content-pdf-fragment

## 0.0.2 (2022-11-14)

**Note:** Version bump only for package @autoanki/autoanki-plugin-content-pdf-fragment
