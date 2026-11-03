/**
 * A package's tests and test helpers, as globs relative to the package. They
 * are type-checked with the package and never shipped.
 */
export const TEST_FILES = [
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "src/tests/**/*",
]
