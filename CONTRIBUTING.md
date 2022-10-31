# Contribution guide

## Structure of the repository

This is a monorepo managed using:

- [PNPM workspace](https://pnpm.io/workspaces)
  - See [pnpm-workspace.yaml](./pnpm-workspace.yaml)
- [Lerna](https://lerna.js.org/docs/introduction)
  - See [lerna.json](./lerna.json)
  - See [nx.json](./nx.json)

## Working on a single package

## Shared configurations among packages

Most packages in this monorepo are transpiled, bundled, packaged in the same way. For this reason, we share a great deal of configuration via:

- [config-utils.mjs](./packages/config-utils.mjs)
  - Every package that uses any utility functions defined in this module has a `config.mjs` script, in which those utility functions are invoked.
  - When you change some default configuration in `config-utils.mjs`, run the `pnpm run update-config` in the workspace so that the change is applied to all the packages that use `config-utils.mjs`.
- [esbuild.common.mts](./packages/esbuild.common.mts)
- [tsconfig.library.json](./packages/tsconfig.library.json)
