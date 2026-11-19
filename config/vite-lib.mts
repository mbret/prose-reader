import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { type ConfigEnv, mergeConfig, type UserConfig } from "vite"

type Entry = string | Record<string, string>

interface LibConfigOptions {
  /** Absolute path to the package directory; pass `import.meta.dirname`. */
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
  /**
   * Emit one file per source module, mirroring `src/`, instead of one bundle
   * per entry. Pair it with `"sideEffects": false` in the package.json: a
   * consumer's bundler can then skip every module the imports it uses do not
   * reach, along with that module's dependencies. In a single bundle, every
   * dependency is imported at the top and stays, whatever the consumer uses.
   * @default false
   */
  preserveModules?: boolean
  /** Extra config deep-merged on top of the defaults (extra plugins, custom test config, etc.). */
  override?: UserConfig
}

type LibConfigInput = LibConfigOptions | ((env: ConfigEnv) => LibConfigOptions)

const buildFileNameFor = (entry: Entry, preserveModules: boolean) => {
  // Every preserved module is named after its path under `src/`, the entry
  // included: `src/index.ts` lands on `index.js`.
  if (preserveModules) {
    return (_format: string, entryName: string) => `${entryName}.js`
  }

  return typeof entry === "string"
    ? "index"
    : (_format: string, entryName: string) => `${entryName}/index.js`
}

export const createLibConfig =
  (input: LibConfigInput) =>
  (env: ConfigEnv): UserConfig => {
    const opts = typeof input === "function" ? input(env) : input
    const {
      packageDir,
      entry = resolve(packageDir, "src/index.ts"),
      minify: minifyOverride,
      target,
      preserveModules = false,
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
          fileName: buildFileNameFor(entry, preserveModules),
          // Naming the format keeps `lib.name` unnecessary (Vite only needs it
          // for UMD/IIFE globals) and avoids the trap where Vite's default
          // `['es', 'umd']` (used whenever `lib.name` is set) emits both `es`
          // and `umd` to the same file for object entries: the UMD write wins,
          // and the ESM named exports vanish.
          formats: ["es"],
        },
        ...(preserveModules
          ? {
              rolldownOptions: {
                output: {
                  preserveModules: true,
                  preserveModulesRoot: resolve(packageDir, "src"),
                },
              },
            }
          : {}),
        sourcemap: true,
        emptyOutDir: env.mode !== "development",
        minify,
        ...(target ? { target } : {}),
      },
      plugins: [externals({ peerDeps: true, deps: true, devDeps: true })],
    }

    return override ? mergeConfig(base, override) : base
  }
