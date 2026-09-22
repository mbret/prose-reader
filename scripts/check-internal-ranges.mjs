/**
 * The rules that keep a release from leaving a package behind.
 *
 * Lerna builds its project graph from `dependencies`, `optionalDependencies`
 * and `devDependencies`. A `peerDependencies` entry produces no edge at all, so
 * a package whose only tie to a sibling is a peer range is invisible to the
 * release — a change to `core` versioned five packages and silently left `cbz`,
 * `enhancer-pdf`, `enhancer-refit`, `enhancer-annotations`, `react-native` and
 * `react-reader` published against a core they no longer matched.
 *
 * So an internal peer range is always paired with a devDependency on the same
 * sibling. The devDependency is honest on its own terms — these packages import
 * the sibling and only resolve it today because npm hoists the workspace — and
 * it is what gives lerna the edge, after which lerna versions the pair together
 * and maintains that range itself.
 *
 * The peer range is then free to mean what a peer range normally means: the
 * oldest sibling this package works with. It has to admit the version in this
 * checkout, because `npm install --package-lock-only` — which lerna runs inside
 * `version` — fails with ERESOLVE otherwise and takes the publish with it.
 *
 * A private app is not published, so the copy it means is always the one in
 * this checkout: it declares `*` and cannot drift at all.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import semver from "semver"

const SCOPE = "@prose-reader/"
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const RANGE_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]

const manifests = ["packages", "apps"].flatMap((directory) =>
  readdirSync(join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, "package.json"))
    .filter((path) => existsSync(join(ROOT, path))),
)

const packages = manifests.map((path) => ({
  path,
  pkg: JSON.parse(readFileSync(join(ROOT, path), "utf8")),
}))

const versions = new Map(
  packages
    .filter(({ pkg }) => pkg.name?.startsWith(SCOPE) && pkg.private !== true)
    .map(({ pkg }) => [pkg.name, pkg.version]),
)

const problems = packages.flatMap(({ path, pkg }) => {
  if (pkg.private === true) {
    return RANGE_FIELDS.flatMap((field) =>
      Object.entries(pkg[field] ?? {})
        .filter(([name, range]) => name.startsWith(SCOPE) && range !== "*")
        .map(
          ([name, range]) =>
            `${path}: ${field}.${name} is "${range}" — a private package declares "*", so it always means the copy in this checkout`,
        ),
    )
  }

  return Object.entries(pkg.peerDependencies ?? {}).flatMap(([name, range]) => {
    if (!name.startsWith(SCOPE)) return []

    const version = versions.get(name)

    if (!version) {
      return [`${path}: peers ${name}, which this repository does not publish`]
    }

    const linked = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]

    return [
      ...(linked
        ? []
        : [
            `${path}: peers ${name} without depending on it, so lerna's graph has no edge and a ${name} release will not version this package`,
          ]),
      ...(semver.satisfies(version, range)
        ? []
        : [
            `${path}: peers ${name}@${range}, which the ${version} in this checkout does not satisfy — the release's lockfile refresh will fail with ERESOLVE`,
          ]),
    ]
  })
})

if (problems.length) {
  console.error("Internal dependency ranges are wrong:\n")
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    '\nSee "Internal `@prose-reader/*` ranges" in AGENTS.md for what each rule is for.\n',
  )
  process.exit(1)
}

console.log(
  `Checked ${packages.length} manifests, every internal range is sound.`,
)
