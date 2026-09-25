/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import { createLibConfig } from "../../config/vite-lib"

export default defineConfig(
  createLibConfig({
    packageDir: __dirname,
  }),
)
