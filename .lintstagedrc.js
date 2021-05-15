module.exports = {
  // check code formatting
  '*.{js,jsx,ts,tsx,json,css,scss,html,md,yml}': ['prettier --check'],
  // lint scripts
  '*.{js,jsx,ts,tsx}': ['eslint --cache'],
  // lint styles
  // Why '--allow-empty-input'?
  // See https://github.com/stylelint/stylelint/issues/4712
  '*.{css,scss,jsx,tsx,html}': ['stylelint --allow-empty-input'],
};
