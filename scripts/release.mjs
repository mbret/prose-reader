/**
 * Releases the commit this run tested, or leaves it to the run of a newer one.
 *
 * Every merge to master starts a run, and runs overlap. A run's checks passed
 * on the commit that triggered it and on nothing after it, so that commit is
 * the only one it may release. When another merge has landed since, that
 * merge's run releases both, so this one steps aside and says so, rather than
 * publishing a commit whose own checks may still be running, or may fail.
 * Release commits lerna pushed on top do not count: they carry versions and
 * changelogs, not code.
 *
 * The workflow runs one release at a time, so lerna never pushes against
 * another run's release. A merge can still land while lerna runs. lerna pushes
 * its release commit and tag atomically before publishing anything, so that
 * push is refused whole, nothing reaches npm, and the newer run releases
 * instead.
 *
 * Every outcome is stated, as the `outcome` output and in the job summary:
 * - `released`: lerna published `version` and tagged `v<version>` at HEAD.
 * - `unchanged`: no published package changed since the last release, as with
 *   a merge that touches only a private app or the docs.
 * - `superseded`: a newer merge's run releases this commit's changes.
 * Anything else fails the job. lerna warns and exits 0 when it cannot release,
 * which is how a skipped release used to report green (#376).
 */
import { execFileSync, spawnSync } from "node:child_process"
import { appendFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const RELEASE_TAG = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/** What `lerna changed` logs, and exits 1 on, when nothing is left to publish. */
const NO_CHANGES = "No changed packages found"

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim()

const lines = (text) => text.split("\n").filter(Boolean)

const fetchMaster = (cwd) =>
  git(cwd, "fetch", "--quiet", "--force", "--tags", "origin", "master")

/** A commit lerna made for a release: its subject is a tag pointing at it. */
const isReleaseCommit = (cwd, sha) => {
  const subject = git(cwd, "log", "-1", "--format=%s", sha)

  return (
    RELEASE_TAG.test(subject) &&
    lines(git(cwd, "tag", "--points-at", sha)).includes(subject)
  )
}

/** The merges master holds after `tested`, lerna's release commits aside. */
const mergesAfter = (cwd, tested) =>
  lines(git(cwd, "rev-list", `${tested}..origin/master`)).filter(
    (sha) => !isReleaseCommit(cwd, sha),
  )

const remoteReleaseTags = (cwd) =>
  new Set(
    lines(git(cwd, "ls-remote", "--tags", "--refs", "origin"))
      .map((line) => line.split("refs/tags/")[1])
      .filter((tag) => RELEASE_TAG.test(tag)),
  )

const superseded = (tested, newer) => ({
  outcome: "superseded",
  summary: `Not released: ${newer.length} newer merge${newer.length === 1 ? "" : "s"} landed after ${tested.slice(0, 9)}, up to ${newer[0].slice(0, 9)}, whose run releases this one's changes with its own.`,
})

/**
 * `lerna` runs lerna with the given arguments in `cwd` and returns
 * `{ status, output }`, its exit code and what it printed.
 */
export const release = ({ cwd, lerna }) => {
  const tested = git(cwd, "rev-parse", "HEAD")
  const branch = git(cwd, "rev-parse", "--abbrev-ref", "HEAD")

  if (branch !== "master") {
    throw new Error(
      `releasing from '${branch}': a release is cut from master, checked out at the commit the run tested`,
    )
  }

  fetchMaster(cwd)

  try {
    git(cwd, "merge-base", "--is-ancestor", tested, "origin/master")
  } catch {
    throw new Error(
      `${tested} is no longer on master, which was rewritten since this run started`,
    )
  }

  const newer = mergesAfter(cwd, tested)

  if (newer.length > 0) return superseded(tested, newer)

  // Only lerna's release commits can sit between the two, so this moves onto
  // versions and changelogs, not code. Left behind, lerna would warn EBEHIND
  // and exit 0 without releasing.
  git(cwd, "merge", "--ff-only", "--quiet", "origin/master")

  const changed = lerna(["changed"])

  if (changed.status !== 0) {
    if (changed.output.includes(NO_CHANGES)) {
      return {
        outcome: "unchanged",
        summary: `No published package changed since the last release, so ${tested.slice(0, 9)} releases none.`,
      }
    }

    throw new Error(
      `lerna changed failed (exit ${changed.status}) without saying nothing changed`,
    )
  }

  const tagsBefore = remoteReleaseTags(cwd)
  const published = lerna([
    "publish",
    "--conventional-commits",
    "--no-private",
    "--yes",
  ])

  if (published.status !== 0) {
    fetchMaster(cwd)

    const pushed = [...remoteReleaseTags(cwd)].filter(
      (tag) => !tagsBefore.has(tag),
    )
    const newerNow = mergesAfter(cwd, tested)

    // A tag is pushed with its release commit or not at all, and lerna
    // publishes only after pushing, so no new tag means nothing was published.
    if (pushed.length === 0 && newerNow.length > 0) {
      return superseded(tested, newerNow)
    }

    throw new Error(`lerna publish failed (exit ${published.status})`)
  }

  const tag = lines(git(cwd, "tag", "--points-at", "HEAD")).find((name) =>
    RELEASE_TAG.test(name),
  )

  if (!tag || tagsBefore.has(tag) || !remoteReleaseTags(cwd).has(tag)) {
    throw new Error(
      "lerna publish exited 0 but released nothing, though packages had changed",
    )
  }

  return {
    outcome: "released",
    version: tag.slice(1),
    summary: `Released ${tag} from ${tested.slice(0, 9)}.`,
  }
}

const runLerna = (cwd) => (args) => {
  const result = spawnSync("pnpm", ["exec", "lerna", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`

  process.stdout.write(output)

  return { status: result.status ?? 1, output }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cwd = process.cwd()

  try {
    const result = release({ cwd, lerna: runLerna(cwd) })
    const outputs = [`outcome=${result.outcome}`]

    if (result.version) outputs.push(`version=${result.version}`)
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `${outputs.join("\n")}\n`)
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### Release: ${result.outcome}\n\n${result.summary}\n`,
      )
    }

    console.log(`::notice title=Release ${result.outcome}::${result.summary}`)
  } catch (error) {
    console.log(`::error title=Release failed::${error.message}`)
    process.exitCode = 1
  }
}
