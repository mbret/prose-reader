/**
 * Raises the internal peer floors that the release being cut would otherwise
 * leave unsatisfiable.
 *
 * An internal peer range says which sibling versions a package works with, and
 * it normally outlives a release: `^2.0.0` keeps being true for every 2.x. The
 * one moment it stops being true is a release that crosses a major, and it then
 * fails loudly and expensively — `npm install --package-lock-only`, which lerna
 * runs inside `version` to refresh the lockfile, cannot resolve a workspace
 * package asking for `@prose-reader/core@^2.0.0` next to a `core` being
 * published as `3.0.0`, so it exits ERESOLVE and takes the publish with it,
 * after the tags have been written.
 *
 * Run from the root `version` lifecycle, which lerna fires once it has written
 * every version but before that lockfile refresh and the release commit, so a
 * raised floor lands in the same release.
 *
 * Nothing stages these edits explicitly, and nothing needs to: a package that
 * peer-depends on a sibling also depends on it (`npm run check:internal-ranges`
 * enforces that pairing), so lerna's graph links them, a release of the sibling
 * versions this package too, and its manifest is already in the set lerna
 * commits. Without that pairing lerna would stage its own files only and these
 * edits would be dropped on the runner while the lockfile kept them — leaving
 * master with a lockfile its manifests disagree with.
 *
 * Only raising, never normalising: a floor above the last major is someone
 * saying this package needs something that sibling added, and rewriting it to
 * whatever is being released would quietly throw that away.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import semver from "semver"

const SCOPE = "@prose-reader/"
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

const manifests = ["packages", "apps"].flatMap((directory) =>
  readdirSync(join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ROOT, directory, entry.name, "package.json"))
    .filter((path) => existsSync(path)),
)

const packages = manifests.map((path) => ({
  path,
  pkg: JSON.parse(readFileSync(path, "utf8")),
}))

// The versions lerna has just written, which are what the floors have to admit.
const versions = new Map(
  packages
    .filter(({ pkg }) => pkg.name?.startsWith(SCOPE) && pkg.private !== true)
    .map(({ pkg }) => [pkg.name, pkg.version]),
)

if (!versions.size) {
  throw new Error(
    `no published ${SCOPE}* package found — cannot tell what is being released`,
  )
}

const raised = []

for (const { path, pkg } of packages) {
  if (pkg.private === true) continue

  const peers = pkg.peerDependencies
  const changed = []

  for (const [name, range] of Object.entries(peers ?? {})) {
    if (!name.startsWith(SCOPE)) continue

    const version = versions.get(name)

    if (!version) {
      throw new Error(
        `${pkg.name} peers ${name}, which this repository does not publish`,
      )
    }

    if (semver.satisfies(version, range)) continue

    // Below the floor rather than above it: someone wrote a range this
    // repository cannot satisfy, which `check:internal-ranges` fails on. Say so
    // instead of "fixing" it by lowering what they asked for.
    if (!semver.gtr(version, range)) {
      throw new Error(
        `${pkg.name} peers ${name}@${range}, which is above the ${version} being released`,
      )
    }

    peers[name] = `^${version}`
    changed.push(`${name} ${range} -> ^${version}`)
  }

  if (!changed.length) continue

  // Matches how the manifests are already written, so the release commit shows
  // the range change and nothing else.
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
  raised.push(`${pkg.name}: ${changed.join(", ")}`)
}

if (raised.length) {
  console.log("Raised the peer floors this release would have broken:")
  for (const line of raised) console.log(`  ${line}`)
} else {
  console.log("Every internal peer floor admits the versions being released")
}
