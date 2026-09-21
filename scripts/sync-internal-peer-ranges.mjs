/**
 * Keeps the `@prose-reader/*` peer ranges that packages declare on each other
 * pointing at the version being released.
 *
 * Lerna rewrites a sibling range it finds in `dependencies`, `optionalDependencies`
 * or `devDependencies`, but it only visits a package pair that its project graph
 * links — and a package whose only tie to a sibling is a peer range produces no
 * such edge. Those ranges were therefore never updated: by 1.372.0 they still read
 * `^1.117.0`, `^1.169.0`, `^1.215.0`, and so on.
 *
 * That drift is invisible while the major stays at 1, because every stale `^1.x`
 * still admits the current version. It stops being invisible the first time a
 * release crosses a major: `cbz@2.0.0` would keep asking for
 * `@prose-reader/archive-reader@^1.320.0`, which nothing satisfies any more, and
 * the `npm install --package-lock-only` that lerna runs to refresh the lockfile
 * fails with ERESOLVE — taking the whole publish with it.
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
  const peers = pkg.peerDependencies

  if (!peers) continue

  const stale = Object.keys(peers).filter(
    (name) => name.startsWith(SCOPE) && peers[name] !== range,
  )

  if (!stale.length) continue

  for (const name of stale) {
    peers[name] = range
  }

  // Matches how the manifests are already written, so the release commit shows
  // the range change and nothing else.
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
  rewritten.push(`${pkg.name}: ${stale.join(", ")}`)
}

if (rewritten.length) {
  console.log(`Pointed internal peer ranges at ${range}:`)
  for (const line of rewritten) console.log(`  ${line}`)
} else {
  console.log(`Internal peer ranges already at ${range}`)
}
