/**
 * Keeps the `@prose-reader/*` ranges that this repository declares on itself
 * pointing at the version being released.
 *
 * Lerna rewrites a sibling range it finds in `dependencies`,
 * `optionalDependencies` or `devDependencies`, but only for a package pair its
 * project graph links, and only for the packages it versions. Two kinds of
 * range fall outside that and went stale for a long time:
 *
 * - a **peer** range, because a package whose only tie to a sibling is a peer
 *   range produces no graph edge. By 1.372.0 they still read `^1.117.0`,
 *   `^1.169.0`, `^1.215.0`, and so on.
 * - every internal range in a **private** package, because `--no-private`
 *   excludes the apps from versioning entirely. `apps/tests` asked for
 *   `@prose-reader/core@^1.120.0` for hundreds of releases.
 *
 * Both drifts are invisible while the major stays at 1, because a stale `^1.x`
 * still admits the current version. They stop being invisible the first time a
 * release crosses a major — and they fail differently, which is why they are
 * corrected differently:
 *
 * - a published package's peer range must name a real range, so it becomes
 *   `^<version>`. Left stale, `cbz@2.0.0` would keep asking for
 *   `@prose-reader/archive-reader@^1.320.0`, which nothing satisfies any more,
 *   and the `npm install --package-lock-only` that lerna runs to refresh the
 *   lockfile fails with ERESOLVE — taking the whole publish with it.
 * - a private app is never installed by anyone, and the copy it means is always
 *   the one in this checkout, so it gets `*`. Left stale, nothing fails: npm
 *   quietly downloads the last published 1.x into `apps/*\/node_modules` and the
 *   app builds and tests against that instead of the workspace. 2.0.0 did
 *   exactly this to all three apps.
 *
 * Run from the root `version` lifecycle, which lerna fires after it has written
 * every package.json but before both that lockfile refresh and the release
 * commit, so the corrected ranges land in the same release.
 *
 * These packages version in lockstep (lerna fixed mode), so a sibling's range is
 * always the version being released.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SCOPE = "@prose-reader/"
const FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const manifests = ["packages", "apps"].flatMap((dir) => {
  const base = join(root, dir)
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(base, entry.name, "package.json"))
    .filter((path) => {
      try {
        readFileSync(path)
        return true
      } catch {
        return false
      }
    })
})

const read = (path) => JSON.parse(readFileSync(path, "utf8"))

// Fixed mode: every published package carries the version being released, so any
// one of them answers what the siblings should point at.
const released = manifests
  .map(read)
  .find((pkg) => pkg.name?.startsWith(SCOPE) && pkg.private !== true)?.version

if (!released) {
  throw new Error(
    `no published ${SCOPE}* package found — cannot tell which version is being released`,
  )
}

const range = `^${released}`
const rewritten = []

for (const path of manifests) {
  const pkg = read(path)
  const isPrivate = pkg.private === true
  // Lerna already maintains a published package's `dependencies`; only its peer
  // ranges are ours. A private app is ours in full.
  const fields = isPrivate ? FIELDS : ["peerDependencies"]
  const wanted = isPrivate ? "*" : range
  const stale = []

  for (const field of fields) {
    const deps = pkg[field]

    if (!deps) continue

    for (const name of Object.keys(deps)) {
      if (!name.startsWith(SCOPE) || deps[name] === wanted) continue

      deps[name] = wanted
      stale.push(`${field}.${name}`)
    }
  }

  if (!stale.length) continue

  // Matches how the manifests are already written, so the release commit shows
  // the range change and nothing else.
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
  rewritten.push(`${pkg.name} -> ${wanted}: ${stale.join(", ")}`)
}

if (rewritten.length) {
  console.log(`Pointed internal ranges at ${released}:`)
  for (const line of rewritten) console.log(`  ${line}`)
} else {
  console.log(`Internal ranges already correct for ${released}`)
}
