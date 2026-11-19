/**
 * Checks that every published `@prose-reader/*` package resolves, with its
 * types, the way a consumer's TypeScript resolves it: `bundler`, and Node's
 * own ES module resolution (`node16`/`nodenext`). Run it after the build: it
 * packs each package as npm would publish it.
 *
 * The packages ship ES modules only, so the `esm-only` profile skips CommonJS
 * and node10 resolution. A relative import without its extension in a
 * declaration file fails here: Node's ES module resolution does not guess
 * extensions, so a consumer under `nodenext` would lose those types.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ATTW = join(ROOT, "node_modules", ".bin", "attw")
const MODULE_EXTENSION = /\.(c|m)?js$/

const publishedPackageDirectories = readdirSync(join(ROOT, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(ROOT, "packages", entry.name))
  .filter((directory) => {
    const manifestPath = join(directory, "package.json")
    return (
      existsSync(manifestPath) &&
      !JSON.parse(readFileSync(manifestPath, "utf8")).private
    )
  })

// A subpath that exports a stylesheet or another asset has no types to check.
const assetSubpathsOf = (directory) => {
  const manifest = JSON.parse(
    readFileSync(join(directory, "package.json"), "utf8"),
  )
  return Object.entries(manifest.exports ?? {})
    .filter(
      ([, target]) =>
        typeof target === "string" && !MODULE_EXTENSION.test(target),
    )
    .map(([subpath]) => subpath)
}

const failedPackageDirectories = publishedPackageDirectories.filter(
  (directory) => {
    const assetSubpaths = assetSubpathsOf(directory)
    const args = ["--pack", directory, "--profile", "esm-only"]
    if (assetSubpaths.length > 0) {
      args.push("--exclude-entrypoints", ...assetSubpaths)
    }
    try {
      execFileSync(ATTW, args, { stdio: "inherit" })
      return false
    } catch {
      return true
    }
  },
)

if (failedPackageDirectories.length > 0) {
  console.error(
    `\nTypes do not resolve for ${failedPackageDirectories.length} package(s):\n${failedPackageDirectories
      .map((directory) => `  ${directory.slice(ROOT.length + 1)}`)
      .join("\n")}`,
  )
  process.exit(1)
}
