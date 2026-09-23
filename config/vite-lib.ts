import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import ts from "typescript"
import {
  type ConfigEnv,
  type LibraryFormats,
  mergeConfig,
  type UserConfig,
} from "vite"
import dts, { type PluginOptions as DtsOptions } from "vite-plugin-dts"

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
  /**
   * Options for the declaration build, merged over {@link dtsPlugin}'s
   * defaults. `false` emits no declarations.
   */
  dts?: false | DtsOptions
}

/**
 * Test files are type-checked with the package but are not part of it. The
 * runtime bundle only carries what the entry reaches; the declarations must
 * not carry more.
 */
const TEST_FILES = ["src/**/*.test.ts", "src/**/*.test.tsx", "src/tests/**/*"]

/**
 * The declaration build every package shares. Options merge over the
 * defaults, so a package adds `staticImport` or a `tsconfigPath` without
 * restating what is excluded.
 *
 * A declaration error fails the build. The plugin only logs one and writes
 * the rest, so a symbol whose type cannot be emitted simply goes missing from
 * `dist` — react-native once shipped a `useCreateReader` consumers saw as
 * `any`, with the build green. `tsc --noEmit` cannot catch that class: errors
 * like TS2883 only exist when declarations are emitted.
 */
export const dtsPlugin = (options: DtsOptions = {}) =>
  dts({
    entryRoot: "src",
    include: ["src/**/*"],
    exclude: TEST_FILES,
    afterDiagnostic: (diagnostics) => {
      const errors = diagnostics.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      )
      if (errors.length > 0) {
        throw new Error(
          `${errors.length} declaration error(s); dist would be missing the declarations they belong to`,
        )
      }
    },
    ...options,
  })

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
      dts: dtsOptions = {},
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
      plugins: [
        externals({ peerDeps: true, deps: true, devDeps: true }),
        ...(dtsOptions === false ? [] : [dtsPlugin(dtsOptions)]),
      ],
    }

    return override ? mergeConfig(base, override) : base
  }
