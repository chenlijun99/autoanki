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
    'prettier/react',
    'prettier/@typescript-eslint',
  ],
  parserOptions: {
    project: ['./packages/**/tsconfig.json', './scripts/tsconfig.json'],
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
    'import/extensions': 'off',
  },
};
