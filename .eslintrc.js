module.exports = {
  root: true,
  extends: [
    /**
     * Use eslint-config-airbnb-typescript as base config
     */
    'airbnb-typescript/base',
    /*
     * From package eslint-config-prettier
     *
     * They disable all the eslint rules related to formatting.
     * Let prettier do its job!
     */
    'prettier',
    'plugin:unicorn/recommended',
    /*
     * Rules concerning best-practices for module import
     */
    'plugin:import/recommended',
  ],
  parserOptions: {
    project: ['./packages/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: {
      // React version. "detect" automatically picks the version you have installed.
      version: 'detect',
    },
  },
  rules: {
    'react/require-default-props': 'off',
    'no-shadow': 'off',
    'no-param-reassign': [
      'error',
      {
        props: false,
      },
    ],
    'arrow-body-style': 'off',
    // temporarily disable this rule, because it crashes
    'import/prefer-default-export': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',
      },
    ],
    // require or disallow a space immediately following the // or /* in a comment
    // https://eslint.org/docs/rules/spaced-comment
    'spaced-comment': [
      'error',
      'always',
      {
        line: {
          exceptions: ['-', '+'],
          markers: ['=', '!', '/'], // space here to support sprockets directives, slash for TS /// comments
        },
        block: {
          exceptions: ['-', '+', '*'],
          markers: ['=', '!', ':', '::'], // space here to support sprockets directives and flow comment types
          balanced: true,
        },
      },
    ],
    'class-methods-use-this': 'off',
    'prefer-destructuring': 'off',
    'no-underscore-dangle': 'off',
    /*
     * Ensure that the extension is specified when importing non-package modules.
     * This is especially important when working with Node.js and ESM modules.
     */
    'import/extensions': ['error', 'ignorePackages'],
    /*
     * Doesn't work well when `import/extensions` is enable. Probably would
     * need to configure additional resolvers, but it's not worth it.
     * These errors are easily spotted when building the project.
     * See https://stackoverflow.com/a/72005986
     */
    'import/no-unresolved': 'off',
    /*
     * Doesn't work so well with monorepo.
     * I would need to create a eslint config for each package, in which
     * I specify to consider also the root package.json. Quite repetitive and
     * error-prone TBH.
     * I can't see how useful this can be. CI/CD should catch most of the
     * problems.
     */
    'import/no-extraneous-dependencies': 'off',
    /*
     * Too invasive. Many abbreviations are arguably known to every programmer
     * (e.g. params, args, etc.).
     */
    'unicorn/prevent-abbreviations': 'off',
    /**
     * Hey, I like `reduce`!
     */
    'unicorn/no-array-reduce': 'off',
    /**
     * Generally, ok. But raises false positive when on NodeList.
     * It's not such an important rule anyway.
     */
    'unicorn/no-array-for-each': 'off',
    'unicorn/no-await-expression-member': 'off',
    'unicorn/prefer-spread': 'off',
    'unicorn/no-empty-file': 'off',
    'unicorn/prefer-ternary': ['warn', 'only-single-line'],
    'unicorn/no-useless-undefined': 'off',
    /**
     * We already have TypeScript to check for us
     */
    'import/named': 'off',
  },
};
