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

Wait on something the reader says, never on time. `waitForSpineItemReady`
waits for an item, and a page is final once `reader.pagination.state.isSettled`
is true. Arm a wait for settlement before the action that changes the page: a
result whose content is already ready settles synchronously inside that
action, and a wait set up afterwards either misses it or accepts the settled
state from before. A `waitForTimeout` is a guess about a machine's speed and
fails on a slower one.

## Assertions

Assert on where content ended up, not on which element happens to contain it:
resolve a cfi and check its position, or check that an element is in the
viewport. A spec runs on five browser profiles with different fonts and page
counts, so assert the preconditions a scenario relies on — which item, which
page, that a cfi is not a root cfi — rather than assuming them, and a failure
then names the step that went wrong.

## Snapshots

A `*-snapshots` folder holds one image per browser project, rendered on the CI
runner's platform. They compare only against the same browser build, which is
why the suite installs its own browsers rather than using whatever a machine
has, and why they are regenerated in CI rather than locally.
