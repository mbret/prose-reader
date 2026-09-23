# prose-reader-tests

The browser suite. Everything here runs in real browsers through Playwright,
which makes it the only place that can verify layout-dependent behaviour:
reflowable pagination, cfi resolution to what is visible, restoration after a
resize, scrolling. The root `AGENTS.md` says when a change belongs here and how
to install the browsers; this file says how the suite is built.

## Layout

Each scenario is a folder under `tests/` with three files: an `index.html`, an
`index.tsx` that creates a reader from a fixture and exposes it as
`window.reader`, and a `*.spec.ts`. A spec drives the page through the URL
(`?cfi=`), the keyboard, or `page.evaluate` against `window.reader`, and reads
state back the same way. Fixtures live in `public/epubs`: reflowable and
pre-paginated epubs, a cbz and a pdf. Shared helpers live in `tests/utils`;
add to them rather than copying a wait or a locator into a second spec.

## Waiting

A timer is a guess about how fast a machine is. A wrong guess fails on a slower
runner, or passes before the thing it was waiting for has happened, and either
way the failure points at the wrong place. Wait on something the reader says
instead: a readiness attribute on an element, a state the reader exposes, an
event it emits. Tie the wait to the action it follows, so it cannot be
satisfied by a state that was already there. If the signal a spec needs does
not exist, add it to the reader or to the shared helpers rather than sleeping
past the gap.

## Assertions

Assert on where content ended up, not on which element happens to contain it:
resolve a cfi and check its position, or check that an element is in the
viewport. A spec runs on five browser profiles with different fonts and page
counts, so assert the preconditions a scenario relies on — which item, which
page, that a cfi is not a root cfi — rather than assuming them, and a failure
then names the step that went wrong.

## Snapshots

A `*-snapshots` folder holds one image per browser project, suffixed with the
platform it was rendered on; the committed ones are `-darwin`, from CI's macOS
runners. An image compares only against the same browser build on the same
platform, which is why the suite installs its own browsers rather than using
whatever a machine has. No CI job rewrites them. To change a baseline, run the
spec with `--update-snapshots` on macOS with the pinned browsers and commit the
result, or take the `-actual` image from the `playwright-report-<shard>`
artifact CI uploads from the shard where a comparison failed.
