# Repository structure

This repository is a mono-repository and is using lerna. Take it into consideration when you want to check typescript, build or run tests for examples.

Guidelines live in `AGENTS.md`, at the root and per package, so every tool reads
the same file. Claude Code discovers `CLAUDE.md` rather than `AGENTS.md`, so
each one needs a sibling `CLAUDE.md` whose body is `@AGENTS.md` — otherwise the
guidance silently reaches some tools and not others. `npm run check:agent-docs`
enforces the pairing and runs in CI; add both files when you add guidelines for
a package.

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

## Prefer derived state over imperative updates

This is an rxjs codebase and the general principle holds: **if a value can be
derived, derive it.** Do not assume imperative code is the way to go just
because that is what is already there.

A value several places write by hand is the recurring bug in this repository.
Every writer has to remember the rules, one of them eventually does not, and the
failure surfaces far from its cause. A value produced by a single stream cannot
have that bug, because there is no second writer to forget anything.

Treat these as smells to rework rather than extend:

- the same field written from more than one place
- a flag that whoever starts some work has to clear — sooner or later an entry
  point will not clear it
- state deposited into a mutable holder mid-stream and re-read downstream,
  instead of flowing through the pipeline as a value
- a `tap` that writes state where a `map` could produce it

Imperative code is sometimes genuinely clearer, and readability counts: a `scan`
nobody can follow is not an improvement. Derive where you can, and say why when
you deliberately do not.

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

Use the Node/npm toolchain the repo pins in `.nvmrc` — do not assume the shell's default Node is correct (web/CI shells may start on a different, older Node). Before running any `npm`, build, test, or lockfile command, activate the pinned version via nvm:

```sh
export NVM_DIR="${NVM_DIR:-/opt/nvm}" && . "$NVM_DIR/nvm.sh" && nvm install && nvm use
```

Workspace packages resolve to their build output, so a package's tests fail with unresolved `@prose-reader/*` imports until its dependencies have been built. Build the libraries before running tests in a fresh checkout, the way CI does:

```sh
npx lerna run build --stream --scope "@prose-reader/*"
```

`nvm install`/`nvm use` read `.nvmrc` from the repo root, so this always follows whatever version is pinned there — no version numbers to keep in sync. Regenerate `package-lock.json` only with the npm that ships with that pinned Node: a mismatched npm rewrites native-binary metadata (e.g. dropping `libc`, mismarking optional platform binaries as `dev`) and produces spurious lockfile churn.

## Internal `@prose-reader/*` ranges

Lerna builds its project graph from `dependencies`, `optionalDependencies` and
`devDependencies`. A `peerDependencies` entry produces no edge at all, so a
package whose only tie to a sibling is a peer range is invisible to the release:
a change to `core` versioned five packages and left `cbz`, `enhancer-pdf`,
`enhancer-refit`, `enhancer-annotations`, `react-native` and `react-reader`
published against a core they no longer matched.

So the rules, all three enforced by `npm run check:internal-ranges` in CI:

- **A peer range on a sibling comes with a `devDependencies` entry on the same
  sibling.** The devDependency is honest on its own terms — these packages
  import the sibling and only resolve it today because npm hoists the workspace
  — and it is what gives lerna the edge, after which lerna versions the pair
  together and maintains that range itself. Do not hand-edit it.
- **The peer range is a floor, not a mirror of the release.** `^2.0.0` stays
  true for every 2.x, so nothing has to rewrite it per release; raise it only to
  say this package needs something a sibling added. It must admit the version in
  this checkout: `npm install --package-lock-only`, which lerna runs inside
  `version`, exits ERESOLVE otherwise and takes the publish with it. The root
  `version` lifecycle runs `scripts/sync-internal-ranges.mjs` for the one case
  nothing can see coming, a release crossing a major, and raises the floors it
  would have broken.
- **A private app (`apps/*`) declares `*`.** It is never installed by anyone and
  the copy it means is always the one in this checkout, so a range only creates a
  way for the two to disagree — silently: once a release crosses a major, `^1.x`
  stops matching the workspace and npm quietly installs the last published 1.x
  into `apps/*/node_modules`, leaving the app building and testing against stale
  packages that still typecheck. 2.0.0 did this to all three apps.

Do not read "fixed mode" as lockstep either. Lerna releases the packages that
changed and their dependents and leaves the rest alone, so the repository holds
several versions at once — 2.0.1 moved `react-native` and `react-reader` and
left the other fifteen at 2.0.0.

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

# Performance

This library needs to be very careful with everything that impact performances (eg: reflow, heavy dom computation). Whenever possible we should use
asynchronous lookup and mechanisms that defer, batch or are fast enough to not impact user experience while reading books.

An example of common issue is `getBoundingClientRect`. Getting elements position is a common use case across prose-reader. Ideally it should always
be in a very controlled way and with better performance alternative when possible (eg: `IntersectionObserver`)

## Avoid redundant DOM writes

When writing frontend code, avoid setting DOM attributes or properties to the same value they already have, especially in hot paths.

Redundant DOM writes can still have costs: they may update internal attribute state, notify mutation observers, trigger custom element reactions, invalidate style/layout work, or cause unnecessary accessibility/rendering updates.

### Applies to

Be careful with repeated writes such as:

```ts
element.setAttribute(name, value);
element.removeAttribute(name);
element.className = nextClassName;
element.textContent = nextText;
input.value = nextValue;
input.checked = nextChecked;
element.hidden = nextHidden;
```

# Epub SPECS

This library is built to support entirely and strictly the epub3 specs. You can access it at https://www.w3.org/TR/epub-33/. The spec and rules should always be enforced

# Non EPUB contents

We also support books that are not epubs (eg: comics, text, pdf). At some point the generated manifest and our handling of them should be consolidated and works the same as an epub. Translation and conversion are to be expected first.

# Layout and in-between stable states

Actions such as navigation can happens anytime (eg: user tap the screen) and in some case may happens during layout or other internal state change happening. This is expected and prose should be resilient to it. The entire internal process is asynchronous on purpose but some actions are synchronous. Make sure to always consider race or stale or invalid in between state conditions.

# Testing

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

# Documentation

The `gitbook/` folder is user-facing documentation that must stay in sync with the code. After any change that alters the public surface or its documented behavior, check whether the docs need updating in the same change — do not defer it.

- Treat doc updates as part of the task, not a follow-up. A feature or fix is not done until the relevant docs reflect it.
- Things that almost always require a doc update: adding/removing/renaming a public export (e.g. a new `createArchiveFrom*` creator), changing a function signature or options, changing a documented type/contract, adding or changing a peer dependency or subpath export, and changing documented defaults or behavior.
- When adding something that belongs to an existing documented list/table (creators, enhancers, hooks, settings…), add it to that list and add a short usage example next to the sibling examples.
- If you add a new doc page, also register it in `gitbook/SUMMARY.md`.
- If a change is purely internal (no public surface or documented behavior affected), no doc update is needed — but state that you checked.

# TypeScript `as` usage

- Avoid using TypeScript's `as` type assertions unless absolutely necessary.
- Only use `as` when there is no safer or more idiomatic alternative (for example, when interfacing with third-party or legacy data you cannot control).
- When you need to use `as`, always add a code comment explaining why it is required in that context.
- Prefer type guards, runtime validation, and stricter data structures to ensure type safety and clarity instead of using type assertions.
- Rationale: Overuse of `as` can hide bugs, undermine type safety, and reduce code maintainability and refactorability.
