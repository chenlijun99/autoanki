# Autoanki

![Github Actions CI](https://github.com/chenlijun99/autoanki/workflows/CI%20pipeline/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/chenlijun99/autoanki/branch/main/graph/badge.svg?token=T6YMIDGJYO)](https://codecov.io/gh/chenlijun99/autoanki)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Set of tools that streamline the learning experience with Anki.

## Features

- Ability to write Anki notes in multiple "source file" formats
  - Writing Anki notes in source files rather than creating them with the Anki GUI interface has the following advantages:
    - For plain text source formats, we can use our favorite text editor.
    - Especially for plain text source formats, it is easy to make collaborative Anki notes, similar to (and probably easier than) [CrowdAnki](https://github.com/Stvad/CrowdAnki).
    - We structure our information via note taking. We isolate pieces of information and then learn them via spaced-repetition using Anki. By extracting Anki notes from source files (which could be our structured notes), we have best of both worlds: structure + spaced-repetition.
  - List of supported source file formats:
    - YAML
    - Markdown
    - PDF
- Best-effort automatic bidirectional sync of Anki notes between source files and an Anki profile, using [Anki-connect](https://github.com/FooSoft/anki-connect). See [@autoanki/sync](./packages/autoanki-sync).
- Anki collection and deck (apkg) generation, to easily share your work with other people who don't use Autoanki.
- A out-of-the-box CLI that exposes most of the functionalities of Autoanki for terminal users.
- Extensibility:
  - Easy to add support for new source file formats, with the plugin-based architecture.
  - Easy to build upon, using APIs provided by a set of simple, yet configurable core components.

## Limitations

- Autoanki deals with Anki notes, not with Anki cards. This means that informations that are bound to Anki cards, such as the card's current deck, are not handled by Autoanki.
  - Some source file formats allow you to specify the deck of a note, but that's only used during note creation.

## Usage and supported environments

### Autoanki applications

- [@autoanki/cli](./packages/autoanki-cli) for terminal users.

### Autoanki libraries

- Most of Autoanki packages were designed to work both in the browser and in Node.js.
- We support TypeScript >=4.8.
- We officially support all the maintained Node.js versions, which at the time of writing means >=Node.js 14.
- Packages are transpiled to ES2020 and provided as ES6 module.
  - So that they can run out-of-the-box on the supported Node.js.
  - So that for browser applications the application developers are free to use whatever bundler + transpiler they want, to further process Autoanki packages down to the target they need to support.
    - Polyfills: [It complicated...](https://github.com/w3ctag/polyfills/issues/6), but following this line of thought we believe it should also be the application developers to assess what they want to support and then introduce the necessary polyfills.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Credits

- [Babel](https://github.com/babel/babel): this project's architecture and monorepo organization is heavily inspired by Babel.
- [Anki-connect](https://foosoft.net/projects/anki-connect/)
- https://github.com/Pseudonium/Obsidian_to_Anki
- https://github.com/ashlinchak/mdanki
