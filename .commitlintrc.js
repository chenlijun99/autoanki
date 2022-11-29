const configLerna = require('@commitlint/config-lerna-scopes');

module.exports = {
  extends: [
    '@commitlint/config-conventional',
    '@commitlint/config-lerna-scopes',
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        /*
         * FAQ:
         *
         * * Q: What to use when removing a feature (removing a function,
         *      dropping support for some platform, etc.)?
         *   A: `feat` with breaking change.
         * * Q: What to use when renaming some public interface?
         *   A: `refactor` with breaking change.
         * * Q: What to use when deprecating something?
         *   A: `docs`.
         */

        /**
         * Changes to CI
         */
        'ci',
        /**
         * Use this when changing the "infrastructure" side of the project:
         *
         * * Introducing new tools or changing their configuration
         * (e.g. linters, formatters,)
         * * Changing configuration of existing tools
         *
         * Often `chore` is used, but IMHO these are not "chores".
         * Tooling are pretty important and often require considerable effort
         * to setup.
         *
         * NOTE: these changes should not impact anybody except the developers
         * of the project.
         */
        'infra',
        /**
         * Changes concerning the package manager and dependencies that dont't
         * impact users
         */
        'deps',
        /**
         * Documentation related changes
         */
        'docs',
        /**
         * New feature for the user.
         *
         * * For an library package the user is an application developer
         * * For an application package the user is the end-user
         */
        'feat',
        /**
         * Fix
         */
        'fix',
        /**
         * Performance improvement
         */
        'perf',
        /**
         * Non cosmetic changes to the codebase that shouldn't change any
         * behaviour of the existing code.
         */
        'refactor',
        'revert',
        /**
         * Cosmetic changes to the codebase
         */
        'style',
        'test',
        /**
         * Generic improvement to the code
         */
        'improvement',
        'chore',
      ],
    ],
    'scope-enum': (ctx) =>
      configLerna.utils.getPackages(ctx).then((packages) => [
        2,
        'always',
        packages.concat(
          /*
           * All package names are allowed scopes. But we define some
           * additional scopes.
           */
          [
            /*
             * Big changes that affect many packages
             */
            'all',
          ]
        ),
      ]),
  },
};
