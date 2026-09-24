/**
 * The release decisions, against real git repositories: a bare `origin`, a
 * clone where other merges land, and the checkout a run releases from. lerna
 * is stood in for by a fake that behaves like it where it matters: behind its
 * upstream it warns EBEHIND and exits 0, and it pushes its release commit and
 * tag atomically before publishing anything.
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, it } from "node:test"
import { release } from "./release.mjs"

Object.assign(process.env, {
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
})

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim()

const roots = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true })
})

/** A repository on 1.0.0, and a way to land merges on it from elsewhere. */
const setUp = () => {
  const root = mkdtempSync(join(tmpdir(), "release-"))
  const origin = join(root, "origin.git")
  const dev = join(root, "dev")
  let checkouts = 0

  roots.push(root)
  git(root, "init", "--quiet", "--bare", "--initial-branch=master", origin)
  git(root, "clone", "--quiet", origin, dev)

  const commit = (cwd, message) => {
    writeFileSync(join(cwd, "log.txt"), `${message}\n`, { flag: "a" })
    git(cwd, "add", "log.txt")
    git(cwd, "commit", "--quiet", "-m", message)

    return git(cwd, "rev-parse", "HEAD")
  }

  commit(dev, "chore: start")
  commit(dev, "v1.0.0")
  git(dev, "tag", "-a", "v1.0.0", "-m", "v1.0.0")
  git(dev, "push", "--quiet", "--follow-tags", "origin", "master")

  return {
    /** Lands a merge on master, as if another pull request had been merged. */
    merge: (message = "feat: something else") => {
      git(dev, "pull", "--quiet", "--ff-only")
      const sha = commit(dev, message)

      git(dev, "push", "--quiet", "origin", "master")

      return sha
    },
    /** A run's checkout: master at the commit the run tested. */
    checkout: (sha) => {
      const cwd = join(root, `ci-${checkouts++}`)

      git(root, "clone", "--quiet", origin, cwd)
      if (sha) git(cwd, "reset", "--quiet", "--hard", sha)

      return cwd
    },
    remoteTags: () =>
      git(root, "ls-remote", "--tags", "--refs", origin)
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split("refs/tags/")[1]),
  }
}

/**
 * Stands in for lerna. `changed` says whether any package changed; `beforePush`
 * runs just before the release is pushed; `npmFails` fails after the push.
 */
const fakeLerna =
  (cwd, { changed = true, beforePush, npmFails = false } = {}) =>
  (args) => {
    if (args[0] === "changed") {
      return changed
        ? { status: 0, output: "@prose-reader/core\n" }
        : { status: 1, output: "lerna info No changed packages found\n" }
    }

    git(cwd, "remote", "update")
    if (Number(git(cwd, "rev-list", "--count", "master..origin/master")) > 0) {
      return {
        status: 0,
        output:
          "lerna WARN EBEHIND Local branch 'master' is behind remote upstream origin/master, exiting\n",
      }
    }

    const [major, minor] = git(cwd, "describe", "--tags", "--abbrev=0")
      .slice(1)
      .split(".")
      .map(Number)
    const tag = `v${major}.${minor + 1}.0`

    writeFileSync(join(cwd, "CHANGELOG.md"), `${tag}\n`, { flag: "a" })
    git(cwd, "add", "CHANGELOG.md")
    git(cwd, "commit", "--quiet", "-m", tag)
    git(cwd, "tag", "-a", tag, "-m", tag)
    beforePush?.()

    try {
      git(
        cwd,
        "push",
        "--quiet",
        "--atomic",
        "--follow-tags",
        "origin",
        "master",
      )
    } catch (error) {
      return { status: 1, output: String(error.stderr) }
    }

    return npmFails
      ? { status: 1, output: "npm error publish failed\n" }
      : { status: 0, output: "" }
  }

/** Counts the calls made to a lerna stand-in. */
const counted = (lerna) => {
  const calls = []
  const wrapped = (args) => {
    calls.push(args[0])
    return lerna(args)
  }

  return { lerna: wrapped, calls }
}

describe("Given the commit a run tested is the newest merge on master", () => {
  it("releases it", () => {
    const repo = setUp()
    const tested = repo.merge("feat: the change")
    const cwd = repo.checkout(tested)

    const result = release({ cwd, lerna: fakeLerna(cwd) })

    assert.equal(result.outcome, "released")
    assert.equal(result.version, "1.1.0")
    assert.deepEqual(repo.remoteTags(), ["v1.0.0", "v1.1.0"])
  })

  it("releases nothing, and says so, when no published package changed", () => {
    const repo = setUp()
    const tested = repo.merge("docs: a guide")
    const cwd = repo.checkout(tested)
    const { lerna, calls } = counted(fakeLerna(cwd, { changed: false }))

    const result = release({ cwd, lerna })

    assert.equal(result.outcome, "unchanged")
    assert.deepEqual(calls, ["changed"])
  })

  it("fails when lerna cannot tell whether anything changed", () => {
    const repo = setUp()
    const cwd = repo.checkout(repo.merge())

    assert.throws(
      () =>
        release({
          cwd,
          lerna: () => ({ status: 1, output: "lerna ERR! ENOGIT\n" }),
        }),
      /lerna changed failed/,
    )
  })

  it("fails when lerna exits 0 without releasing what had changed", () => {
    const repo = setUp()
    const cwd = repo.checkout(repo.merge())
    const lerna = (args) =>
      args[0] === "changed"
        ? { status: 0, output: "@prose-reader/core\n" }
        : { status: 0, output: "lerna WARN something, exiting\n" }

    assert.throws(() => release({ cwd, lerna }), /released nothing/)
  })

  it("fails when npm refuses the packages after the release was pushed", () => {
    const repo = setUp()
    const cwd = repo.checkout(repo.merge())

    assert.throws(
      () => release({ cwd, lerna: fakeLerna(cwd, { npmFails: true }) }),
      /lerna publish failed/,
    )
  })
})

describe("Given a newer merge landed after the commit a run tested", () => {
  it("leaves the release to the newer merge's run, without calling lerna", () => {
    const repo = setUp()
    const tested = repo.merge("feat: the change")
    const cwd = repo.checkout(tested)
    const newer = repo.merge("fix: the next change")
    const { lerna, calls } = counted(fakeLerna(cwd))

    const result = release({ cwd, lerna })

    assert.equal(result.outcome, "superseded")
    assert.match(result.summary, new RegExp(newer.slice(0, 9)))
    assert.deepEqual(calls, [])
    assert.deepEqual(repo.remoteTags(), ["v1.0.0"])
  })

  it("leaves it to the newer run when the merge lands while lerna is releasing", () => {
    const repo = setUp()
    const cwd = repo.checkout(repo.merge("feat: the change"))

    const result = release({
      cwd,
      lerna: fakeLerna(cwd, { beforePush: () => repo.merge("fix: late") }),
    })

    assert.equal(result.outcome, "superseded")
    assert.deepEqual(repo.remoteTags(), ["v1.0.0"])
  })
})

describe("Given only release commits landed after the commit a run tested", () => {
  it("releases from master's tip, rather than stopping behind it", () => {
    const repo = setUp()
    const tested = repo.merge("feat: the change")
    const first = repo.checkout(tested)

    release({ cwd: first, lerna: fakeLerna(first) })

    // a second attempt of the same run: master now holds v1.1.0 on top
    const rerun = repo.checkout(tested)
    const result = release({ cwd: rerun, lerna: fakeLerna(rerun) })

    assert.equal(result.outcome, "released")
    assert.equal(result.version, "1.2.0")
  })
})

describe("Given master no longer holds the commit a run tested", () => {
  it("fails", () => {
    const repo = setUp()
    const tested = repo.merge("feat: rewritten away")
    const cwd = repo.checkout(tested)
    const dev = join(cwd, "..", "dev")

    git(dev, "reset", "--quiet", "--hard", "HEAD~1")
    git(dev, "push", "--quiet", "--force", "origin", "master")

    assert.throws(
      () => release({ cwd, lerna: fakeLerna(cwd) }),
      /no longer on master/,
    )
  })
})
