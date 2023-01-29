module.exports = {
  env: {
    browser: true,
    es2021: true,
    "jest/globals": true,
  },
  extends: [`plugin:jest/recommended`, `prettier`, `plugin:react/recommended`],
  parser: `@typescript-eslint/parser`,
  parserOptions: {
    ecmaVersion: 12,
    sourceType: `module`,
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [`jest`, `@typescript-eslint`, `react`],
  rules: {
    "node/no-callback-literal": `off`, // huh, 1990 coding
    "no-unused-vars": `off`, // use ts
    "no-use-before-define": `off`, // use ts
    "no-undef": `off`, // use ts
    "no-redeclare": `off`, // use ts
    "@typescript-eslint/no-explicit-any": ["off"],
  },
}
