module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
    // "jest/globals": true,
  },
  // extends: [`plugin:jest/recommended`, `standard`],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    `prettier`,
  ],
  parser: `@typescript-eslint/parser`,
  //   parserOptions: {
  //     ecmaVersion: 12,
  //     sourceType: `module`,
  //   },
  // plugins: [`jest`, `@typescript-eslint`],
  plugins: [`@typescript-eslint`],
  rules: {
    // quotes: [`error`, `backtick`],
  },
  ignorePatterns: [`dist`],
}
