module.exports = {
  env: {
    browser: true,
    es2021: true,
    // "jest/globals": true,
  },
  // extends: [`plugin:jest/recommended`, `standard`],
  extends: [`prettier`],
  parser: `@typescript-eslint/parser`,
  //   parserOptions: {
  //     ecmaVersion: 12,
  //     sourceType: `module`,
  //   },
  //   plugins: [`jest`, `@typescript-eslint`],
  rules: {
    // quotes: [`error`, `backtick`],
  },
  ignorePatterns: [`dist`],
};
