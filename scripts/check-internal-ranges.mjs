/**
 * The rules that keep internal `@prose-reader/*` references both linked here and
 * installable once published.
 *
 * Every reference uses the workspace protocol. A plain range is resolved like
 * any other: pnpm fetches a published copy and installs it beside the one in
 * this checkout, and nothing fails. That is how 2.0.0 detached every app from
 * the workspace. A `workspace:` range can only ever mean the checkout, and pnpm
 * refuses to install rather than fetch when it cannot be satisfied.
 *
 * A published package uses `workspace:^`, which lerna turns into `^<version>`
 * at publish time, the version the sibling has when the release is cut. That
 * is also what gives lerna its graph edges, peers included, so nothing has to
 * be kept in step by hand and a release crossing a major has nothing to raise.
 * `workspace:*` would publish an exact pin instead, and a consumer's copies of
 * the siblings could never deduplicate. A private app is never published, so it
 * uses `workspace:*`.
 *
 * A sibling appears in one dependency field of a package, never two. Lerna
 * rewrites the protocol only in the first field naming the sibling —
 * dependencies, then optional, dev and peer dependencies — so a peer range with
 * a devDependency beside it is published as the literal `workspace:^`, which no
 * consumer can install. A peer range on a sibling needs no devDependency: pnpm
 * links workspace peers for the package's own build and tests.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SCOPE = "@prose-reader/"
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const RANGE_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "devDependencies",
  "peerDependencies",
]

const manifests = ["packages", "apps"].flatMap((directory) =>
  readdirSync(join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, "package.json"))
    .filter((path) => existsSync(join(ROOT, path))),
)

const problems = manifests.flatMap((path) => {
  const pkg = JSON.parse(readFileSync(join(ROOT, path), "utf8"))
  const expected = pkg.private === true ? "workspace:*" : "workspace:^"
  const fieldsNaming = new Map()

  const ranges = RANGE_FIELDS.flatMap((field) =>
    Object.entries(pkg[field] ?? {})
      .filter(([name]) => name.startsWith(SCOPE))
      .flatMap(([name, range]) => {
        fieldsNaming.set(name, [...(fieldsNaming.get(name) ?? []), field])
        return range === expected
          ? []
          : [
              `${path}: ${field}.${name} is "${range}" — ${pkg.private === true ? "a private package" : "a published package"} declares "${expected}"`,
            ]
      }),
  )

  const duplicates =
    pkg.private === true
      ? []
      : [...fieldsNaming]
          .filter(([, fields]) => fields.length > 1)
          .map(
            ([name, fields]) =>
              `${path}: ${name} is in ${fields.join(" and ")} — lerna rewrites only the first, so the ${fields.at(-1)} entry would be published as "workspace:^"`,
          )

  return [...ranges, ...duplicates]
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
  `Checked ${manifests.length} manifests, every internal range is sound.`,
)
