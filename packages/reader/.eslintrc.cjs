const extend = require(`../../.eslintrc.cjs`)

module.exports = {
  ...extend,
  rules: {
    ...extend.rules,
    "@typescript-eslint/no-empty-function": "warn",
    "@typescript-eslint/ban-types": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
  },
}
