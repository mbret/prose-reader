# Repository structure

This repository is a mono-repository: pnpm workspaces, with lerna on top for task running and releases. Take it into consideration when you want to check typescript, build or run tests for examples.

Guidelines live in `AGENTS.md`, at the root and per package, so every tool reads
the same file. Claude Code discovers `CLAUDE.md` rather than `AGENTS.md`, so
each one needs a sibling `CLAUDE.md` whose body is `@AGENTS.md` — otherwise the
guidance silently reaches some tools and not others. `pnpm run check:agent-docs`
enforces the pairing and runs in CI; add both files when you add guidelines for
a package.

# Writing code

The code-level guidelines live in the `writing-typescript` skill,
`.claude/skills/writing-typescript/SKILL.md`: naming, deriving state rather than
writing it, DOM reads and writes, and TypeScript `as`. Load it before writing,
changing or reviewing code, in any package, app, test or script. A tool without
skills reads that file directly.

# Raising quality is the job

prose is a library, not a product repository where features get added and
everything else is merely maintained. The code is large, predates AI assistance,
and is inconsistent in places. Every change is expected to leave it better.
Disturbing as little as possible is not a goal here, and "it was the smallest
change" is never a reason on its own.

So:

- **Fight the architecture when it is wrong.** The surrounding code is not a
  specification. If the shape you were asked to extend is the reason the bug
  exists, change the shape.
- **Do not follow a pattern just because it is there**, especially a smelly one.
  Match the surrounding code on naming, comments and idiom — not on structure
  that should not have been there.
- **Ask "what would this look like written fresh?" before "what is the smallest
  change from here?"** Answer the first question, then decide how much of it to
  do now. Starting from the second reproduces whatever is already wrong.
- **Challenge the request.** When a task touches something that deserves a
  larger rework, say so and propose it instead of quietly doing the narrow
  thing. You are not expected to stay inside the boundary of what was asked when
  what you found is bigger than it.
- **Hunt duplication, redundancy and deletions on every change**, not only when
  asked. In an rxjs codebase they compound: two sources of the same truth become
  two subscriptions, two orderings and a race. Removing code is a good outcome.

A smaller, simpler surface that is easier to consume beats a larger one that was
easier to arrive at. Breaking the API to get there is expected — see *API
design: breaking changes are not a constraint*.

## Shape is not covered by tests

Tests verify behaviour, not structure — a badly shaped implementation passes all
of them. Check the shape deliberately:

- A design sentence in your summary or PR description is a claim about the code.
  Verify it against your own diff before pushing, the same way you verify a test.
- Adding a call to a mutator is a signal. Look at who else calls it, and whether
  any of them should.
- When the surrounding code has just changed, re-derive the design instead of
  extending the plan you made before it changed.

# Toolchain

Use the Node the repo pins in `.nvmrc` and the pnpm it pins in the root `package.json`'s `packageManager` — do not assume the shell's defaults are correct (web/CI shells may start on a different, older Node). Before running any pnpm, build, test, or lockfile command, activate the pinned Node via nvm, then install the pinned pnpm if the shell does not already have it:

```sh
export NVM_DIR="${NVM_DIR:-/opt/nvm}" && . "$NVM_DIR/nvm.sh" && nvm install && nvm use
npm install --global "$(node -p "require('./package.json').packageManager")"
```

Workspace packages resolve to their build output, so a package's tests fail with unresolved `@prose-reader/*` imports until its dependencies have been built. Build the libraries before running tests in a fresh checkout, the way CI does:

```sh
pnpm install
pnpm exec lerna run build --stream --scope "@prose-reader/*"
```

`nvm install`/`nvm use` read `.nvmrc` from the repo root, and CI reads the same `.nvmrc` and `packageManager`, so both follow whatever is pinned — no version numbers to keep in sync. Regenerate `pnpm-lock.yaml` only with that pinned pnpm: another major can rewrite the lockfile's format.

pnpm gives each package only what its own manifest declares. Declare a dependency in the package that imports it: anything the published code or its types import in `dependencies` or `peerDependencies`, a test-only import in `devDependencies`. Build tooling shared by every package (vite, vitest, the dts and externals plugins) is declared once at the root. The React Native demo is the exception to the workspace: it is not a member, and installs with npm from its own lockfile, the way an app consuming the libraries would.

## Browser tests

`apps/tests` (`prose-reader-tests`) is a Playwright suite, and the root
`pnpm test` runs it alongside the vitest suites. CI runs the two apart: the
vitest suites on Linux, and every spec of this one, split across shards, on
macOS, where its screenshot baselines are rendered, on Chromium, Firefox,
WebKit and two mobile profiles. It needs the browser builds its Playwright
version pins. Install them once per environment, the way CI does:

```sh
pnpm --filter prose-reader-tests exec playwright install --with-deps
```

Chromium alone is enough while you work on a spec and run only its project:

```sh
pnpm --filter prose-reader-tests exec playwright install chromium
```

Never point the suite at a browser the machine already has. A different build
is not the one the snapshots were rendered with, and a pass on it is not a pass
in CI.

The test app imports `@prose-reader/*` from `dist`, so build the libraries
first and rebuild the package you changed before re-running a spec, including
while degrading a guard to watch its test fail. Run one spec with:

```sh
pnpm --filter prose-reader-tests test --project=chromium tests/<path>.spec.ts
```

## Internal `@prose-reader/*` ranges

Every reference to a sibling uses the workspace protocol. Lerna reads those as
graph edges, peers included, so a release of a sibling also releases everything
built on it; at publish time it writes `^<version>` in their place, from the
version each sibling has when the release is cut. Nothing is kept in step by
hand, and a release crossing a major has nothing to raise. Two rules follow,
both enforced by `pnpm run check:internal-ranges` in CI and explained where it
is implemented:

- **A published package declares `workspace:^`, a private app `workspace:*`.**
  A plain range is resolved from the registry, and pnpm installs a published
  copy of the sibling beside the one in the checkout without complaint.
- **A sibling appears in one dependency field of a package.** Lerna rewrites
  the protocol only in the first field that names it, so a peer range with a
  devDependency beside it is published as the literal `workspace:^`. A peer
  needs no devDependency: pnpm links workspace peers for the package's own
  build and tests.

Do not read lerna's "fixed mode" as lockstep either: 2.0.1 moved `react-native`
and `react-reader` and left the other fifteen packages at 2.0.0.

# API design: breaking changes are not a constraint

Cleanliness of the design wins. The goal is a surface that is smaller, simpler and easier to consume; a break is just the cost of getting there. **"I did not do that because it would be a breaking change" is never a valid reason** — do not weigh backward compatibility when choosing a shape, and do not present it as a trade-off. If the cleanest design changes a public type, renames an export, removes an option or reshapes a returned entity, do that.

Concretely, never do these unless explicitly asked:

- keep a deprecated export, alias or overload alive "for compatibility"
- add an opt-in flag or option whose only purpose is preserving the old behavior
- pick a weaker shape (a sibling field, an optional add-on, a widened union) because the better one would break consumers
- write a migration shim, adapter or compatibility layer

What is still expected of you:

- update every in-repo consumer (all packages, examples, tests) in the same change — a break you introduce is a break you fix repo-wide, and the repo must typecheck and pass tests
- update `gitbook/` for the new surface, per the Documentation section — not the old one, and no "previously this was…" notes
- state the break plainly in your summary, including when it needs a semver major, so the release can be handled

# Epub SPECS

This library is built to support entirely and strictly the epub3 specs. You can access it at https://www.w3.org/TR/epub-33/. The spec and rules should always be enforced

# Non EPUB contents

We also support books that are not epubs (eg: comics, text, pdf). At some point the generated manifest and our handling of them should be consolidated and works the same as an epub. Translation and conversion are to be expected first.

# Layout and in-between stable states

Actions such as navigation can happens anytime (eg: user tap the screen) and in some case may happens during layout or other internal state change happening. This is expected and prose should be resilient to it. The entire internal process is asynchronous on purpose but some actions are synchronous. Make sure to always consider race or stale or invalid in between state conditions.

# Testing

There are two layers, and the browser one is not optional. Vitest in each
package runs in happy-dom or jsdom, which have no layout engine: nothing there
measures text, paginates a reflowable document, or resolves a cfi to a visible
node. A change whose behaviour depends on layout — reflowable pagination,
first-visible-node cfis, restoration after a resize, scrolling — is not covered
until it has a spec in `apps/tests`, whatever the unit tests say. Use the unit
layer for logic and the in-between states, and the browser layer for what only
a browser can show. `apps/tests/AGENTS.md` describes how that suite is built.

A regression test that was never seen to fail proves nothing. Before you rely on
one, run it against the unfixed code and check that it fails, and that it fails
on the assertion you meant rather than an earlier one — a failure message naming
the wrong thing will mislead whoever hits it next.

Drive the real objects with controlled completion points, rather than a fixture
that only exposes the finished state. A fixture built from the happy path
reproduces the happy path: the interesting conditions in this codebase are the
in-between ones, where a layout is half done, an item is loaded but not laid
out, or a request has been superseded. Mock the boundary you need to hold open
(a renderer, a resource) and let the rest of the lifecycle run.

Write the assertion against the invariant where you can, not only the symptom.
"no state ever had readiness without a loaded document" keeps holding as the
code moves; "this one unload clears the flag" stops testing the rule the moment
the implementation shifts.

Do not assume an existing test is right, or that a green suite is safe. A test
can pass for the wrong reason — this suite has had a green test that only held
because of a feedback loop nobody intended, and it went red the moment the loop
was closed — or assert a symptom that no longer means what it did, or never
have been seen to fail at all. Challenge tests the way you challenge code: read
what a test actually proves, degrade the code it claims to guard, and rewrite or
delete it when it does not hold up. Testing this library is hard, since most of
what matters happens between stable states and some of it only in a browser, so
the suite is never finished. Keeping it honest is a standing part of every
change, not a task that was done once.

## Nothing in the library exists only for a test

Everything in the source is API. A test may use whatever the library exposes,
but it does not get to add to it: an export, a method, a stream, an option or a
flag that exists so a spec can observe something does not belong in the source.

When a test needs something the library does not expose:

- **Check the layer.** A timing or ordering property of our own code, such as
  whether a debounced report ends in a layout, can usually be proved in the
  unit layer, where the test holds the boundary and the clock. It needs no
  signal from a browser.
- **Build it in the test helpers** from what the library already exposes.
- **Add it to the library only if it makes sense there on its own terms.** It
  has to be shaped and named like the surface around it, and be something a
  consumer could reasonably use. It does not need a consumer today; it needs to
  fit.
- **Otherwise stop and raise it with the maintainer** before adding anything.
  This is not a decision to make alone.

`isContainerResizePending$` was added once so a browser spec could prove that a
layout did not happen. Nothing else used it, it was awkward to use correctly,
and the unit tests already proved what it was for. It was dropped before it was
released.

# Documentation

The `gitbook/` folder is user-facing documentation that must stay in sync with the code. After any change that alters the public surface or its documented behavior, check whether the docs need updating in the same change — do not defer it.

- Treat doc updates as part of the task, not a follow-up. A feature or fix is not done until the relevant docs reflect it.
- Things that almost always require a doc update: adding/removing/renaming a public export (e.g. a new `createArchiveFrom*` creator), changing a function signature or options, changing a documented type/contract, adding or changing a peer dependency or subpath export, and changing documented defaults or behavior.
- When adding something that belongs to an existing documented list/table (creators, enhancers, hooks, settings…), add it to that list and add a short usage example next to the sibling examples.
- If you add a new doc page, also register it in `gitbook/SUMMARY.md`.
- If a change is purely internal (no public surface or documented behavior affected), no doc update is needed — but state that you checked.
