import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import {
  type ConfigEnv,
  type LibraryFormats,
  mergeConfig,
  type UserConfig,
} from "vite"

type Entry = string | Record<string, string>

interface LibConfigOptions {
  /** Absolute path to the package directory; pass `__dirname`. */
  packageDir: string
  /** @default `${packageDir}/src/index.ts` */
  entry?: Entry
  /**
   * Overrides `build.minify`.
   * @default `false` in development, `"oxc"` otherwise.
   */
  minify?: boolean | "oxc" | "esbuild"
  /** Forwarded to `build.target`. */
  target?: string
  /** Extra config deep-merged on top of the defaults (extra plugins, custom test config, etc.). */
  override?: UserConfig
}

type LibConfigInput = LibConfigOptions | ((env: ConfigEnv) => LibConfigOptions)

// We only ship ESM + CJS — no UMD. This keeps `lib.name` unnecessary (Vite only
// needs it for UMD/IIFE globals) and, crucially, avoids the trap where Vite's
// default `['es', 'umd']` (used whenever `lib.name` is set) emits both `es` and
// `umd` to the same file for object entries — the UMD write wins and the ESM
// named exports vanish. `es` -> `.js`, `cjs` -> `.cjs`, and both filename
// schemes below give the two formats distinct paths.
const FORMATS: LibraryFormats[] = ["es", "cjs"]

const buildFileNameFor = (entry: Entry) =>
  typeof entry === "string"
    ? "index"
    : (format: string, entryName: string) =>
        `${entryName}/index.${format === "cjs" ? "cjs" : "js"}`

export const createLibConfig =
  (input: LibConfigInput) =>
  (env: ConfigEnv): UserConfig => {
    const opts = typeof input === "function" ? input(env) : input
    const {
      packageDir,
      entry = resolve(packageDir, "src/index.ts"),
      minify: minifyOverride,
      target,
      override,
    } = opts

    const minify =
      minifyOverride !== undefined
        ? minifyOverride
        : env.mode === "development"
          ? false
          : "oxc"

    const base: UserConfig = {
      build: {
        lib: {
          entry,
          fileName: buildFileNameFor(entry),
          formats: FORMATS,
        },
        sourcemap: true,
        emptyOutDir: env.mode !== "development",
        minify,
        ...(target ? { target } : {}),
      },
      plugins: [externals({ peerDeps: true, deps: true, devDeps: true })],
    }

    return override ? mergeConfig(base, override) : base
  }
