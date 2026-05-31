import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { type ConfigEnv, mergeConfig, type UserConfig } from "vite"

type Entry = string | Record<string, string>

interface LibConfigOptions {
  /** Absolute path to the package directory; pass `__dirname`. */
  packageDir: string
  /** Package name from `package.json` (e.g. `@prose-reader/streamer`). Used as the UMD global name. */
  packageName: string
  /** @default `${packageDir}/src/index.ts` */
  entry?: Entry
  /**
   * Overrides `build.minify`.
   * @default `false` in development, `"esbuild"` otherwise.
   */
  minify?: boolean | "esbuild"
  /** Forwarded to `build.target`. */
  target?: string
  /**
   * `output.globals` for UMD when dependencies are external (Rollup).
   * Avoids "No name was provided for external module … in output.globals".
   */
  umdGlobals?: Record<string, string>
  /** Extra config deep-merged on top of the defaults (extra plugins, custom test config, etc.). */
  override?: UserConfig
}

type LibConfigInput = LibConfigOptions | ((env: ConfigEnv) => LibConfigOptions)

const toUmdName = (packageName: string) =>
  packageName.replace("@", "").replace("/", "-")

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
      packageName,
      entry = resolve(packageDir, "src/index.ts"),
      minify: minifyOverride,
      target,
      umdGlobals,
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
          name: toUmdName(packageName),
          fileName: buildFileNameFor(entry),
        },
        sourcemap: true,
        emptyOutDir: env.mode !== "development",
        minify,
        ...(target ? { target } : {}),
        rollupOptions: {
          output: {
            ...(umdGlobals !== undefined ? { globals: umdGlobals } : {}),
          },
        },
      },
      plugins: [externals({ peerDeps: true, deps: true, devDeps: true })],
    }

    return override ? mergeConfig(base, override) : base
  }
