module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    `prettier`,
  ],
  parser: `@typescript-eslint/parser`,
  plugins: [`@typescript-eslint`],
  ignorePatterns: [`dist`],
  rules: {
    "@typescript-eslint/no-empty-function": "warn",
    "@typescript-eslint/ban-types": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
  },
}
