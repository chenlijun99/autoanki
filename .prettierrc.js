module.exports = {
  overrides: [
    {
      files: ['.prettierrc', '.babelrc', '.eslintrc', '.stylelintrc'],
      options: {
        parser: 'json',
      },
    },
  ],
  proseWrap: 'always',
  singleQuote: true,
};
