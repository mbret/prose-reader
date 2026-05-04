import { resolve } from "node:path"
import externals from "rollup-plugin-node-externals"
import { type ConfigEnv, mergeConfig, type UserConfig } from "vite"
import dts from "vite-plugin-dts"
import { defineConfig } from "vitest/config"

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
  /** Options forwarded to `vite-plugin-dts`. Defaults merge `{ entryRoot: "src" }`. */
  dts?: Parameters<typeof dts>[0]
  /**
   * `output.globals` for UMD when dependencies are external (Rollup).
   * Avoids "No name was provided for external module … in output.globals".
   */
  umdGlobals?: Record<string, string>
  /** Disable the `rollup-plugin-node-externals` plugin. @default true */
  externalize?: boolean
  /** Extra config deep-merged on top of the defaults (extra plugins, custom test config, etc.). */
  override?: UserConfig
}

type LibConfigInput = LibConfigOptions | ((env: ConfigEnv) => LibConfigOptions)

const toUmdName = (packageName: string) =>
  packageName.replace("@", "").replace("/", "-")

const buildFileNameFor = (entry: Entry) =>
  typeof entry === "string"
    ? "index"
    : (format: string, entryName: string) => `${entryName}/index.${format}.js`

export const defineLibConfig = (input: LibConfigInput) =>
  defineConfig((env) => {
    const opts = typeof input === "function" ? input(env) : input
    const {
      packageDir,
      packageName,
      entry = resolve(packageDir, "src/index.ts"),
      minify: minifyOverride,
      target,
      dts: dtsOptions,
      umdGlobals,
      externalize = true,
      override,
    } = opts

    const minify =
      minifyOverride !== undefined
        ? minifyOverride
        : env.mode === "development"
          ? false
          : "esbuild"

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
      plugins: [
        ...(externalize
          ? [externals({ peerDeps: true, deps: true, devDeps: true })]
          : []),
        dts({
          entryRoot: "src",
          ...dtsOptions,
        }),
      ],
      test: {
        coverage: {
          reportsDirectory: "./.test/coverage",
        },
      },
    }

    return override ? mergeConfig(base, override) : base
  })
