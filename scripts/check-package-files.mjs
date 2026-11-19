/**
 * Checks that every file a published package's manifest names exists: `main`,
 * `types`, and each target of `exports`. Run it after the build, before
 * `@arethetypeswrong/cli`, which passes a package that has no declarations at
 * all, as if it were a package without types. The declarations are a build
 * step of their own, so a build that skips it would otherwise ship untyped.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const PACKAGES = fileURLToPath(new URL("../packages", import.meta.url))

const targetsOf = (exportsField) =>
  typeof exportsField === "string"
    ? [exportsField]
    : Object.values(exportsField ?? {}).flatMap(targetsOf)

const missingFiles = readdirSync(PACKAGES).flatMap((name) => {
  const manifestPath = join(PACKAGES, name, "package.json")
  if (!existsSync(manifestPath)) return []
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  if (manifest.private) return []
  const targets = [
    manifest.main,
    manifest.types,
    ...targetsOf(manifest.exports),
  ]
  return [...new Set(targets.filter(Boolean))]
    .filter((target) => !existsSync(join(PACKAGES, name, target)))
    .map((target) => `  ${manifest.name}: ${target}`)
})

if (missingFiles.length > 0) {
  console.error(
    `Files named in package manifests are missing:\n${missingFiles.join("\n")}`,
  )
  process.exit(1)
}
