module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  customSyntax: '@stylelint/postcss-css-in-js',
  rules: {
    'value-keyword-case': null,
    'selector-type-no-unknown': null,
    'selector-type-case': null,
    'rule-empty-line-before': null,
    'selector-class-pattern': null,
    // has some false positives
    'property-no-unknown': null,
  },
};
