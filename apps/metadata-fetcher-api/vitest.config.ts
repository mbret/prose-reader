import { defineConfig } from "vitest/config"

const SOURCE_CONDITION = "prose-source"

export default defineConfig({
  // Resolve @prose-reader/metadata-fetcher to its TypeScript source, the same
  // way the app does at runtime (`node --conditions=prose-source`) and at
  // typecheck time (`customConditions` in tsconfig.json). All three agree, so
  // nothing here needs the package built.
  //
  // Both spellings: vite resolves per-environment, and tests run in the ssr
  // one — `resolve.conditions` alone does not reach it.
  resolve: {
    conditions: [SOURCE_CONDITION],
  },
  ssr: {
    resolve: {
      conditions: [SOURCE_CONDITION],
    },
  },
})
