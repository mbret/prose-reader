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
(`?cfi=`), the keyboard, or the reader, which `getReader(page)` from
`tests/utils/reader.ts` hands it typed, and reads state back the same way.
Fixtures live in `public/epubs`: reflowable and pre-paginated epubs, comics and
PDFs. A fixture a script builds is rebuilt with that script, not edited: the
scripts are in `tools/`, and those of the KOReader page fixtures in
`packages/koreader/tools/`. Shared helpers live in `tests/utils`; add to them
rather than copying a wait or a locator into a second spec.

## Loading the book

A scenario opens a fixture with `openFixtureBook` (`tests/fixtureBook.ts`) and
passes what it returns to the reader. The book reaches the reader one of two
ways, and apps use both:

- over http: the test app's server streams it on the page's origin, as an
  app's service worker or server does, and the reader loads each document
  straight from its url;
- from blobs: the page streams it itself and hands the reader each resource as
  a `Response`, as the getting-started guide does, and the reader loads each
  document from a blob and resolves its assets itself.

The reader has to render and behave the same either way, so every spec runs
both ways, and no spec asks which. The way belongs to the Playwright project
(`playwright.config.ts`): `chromium` loads over http and `chromium-blob` from
blobs, and so on for Firefox and WebKit. The mobile profiles load over http
only, which keeps CI's run time in check. A project hands its way to its pages
in `localStorage` (`tests/utils/resourceLoading.ts`), and
`tests/fixtureBook.spec.ts` proves each project's documents come in that way.
Run a spec both ways on Chromium with `--project='chromium*'`. A scenario opened
by hand loads over http.

## Waiting

A timer is a guess about how fast a machine is. A wrong guess fails on a slower
runner, or passes before the thing it was waiting for has happened, and either
way the failure points at the wrong place. Wait on something the reader says
instead: a readiness attribute on an element, a state the reader exposes, an
event it emits. Tie the wait to the action it follows, so it cannot be
satisfied by a state that was already there. When the action changes what is
on screen, polling for the new result does that on its own: the state before
the action cannot match it. Wait on the reader when the result looks the same
before and after, as a position restored after a resize does. If the signal a
spec needs does not exist, do not sleep past the gap. Build it in the shared
helpers from what the reader already exposes, or prove the property in the unit
layer instead.
Adding a signal to the reader is a change to the library like any other, and
the root `AGENTS.md`, *Nothing in the library exists only for a test*, says
when that is acceptable.

## Assertions

Assert on where content ended up, not on which element happens to contain it:
resolve a cfi and check its position, or check that an element is in the
viewport. A spec runs on five browser profiles with different fonts and page
counts, so assert the preconditions a scenario relies on — which item, which
page, that a cfi is not a root cfi — rather than assuming them, and a failure
then names the step that went wrong.

## Snapshots

A `*-snapshots` folder holds one image per browser profile, suffixed with the
platform it was rendered on; the committed ones are `-darwin`, from CI's macOS
runners. The projects of a profile compare against that one image, since a
book renders the same however it reaches the reader: `chromium-blob` against
`chromium`'s, and a blob render that differs from it fails. An image compares
only against the same browser build on the same platform, which is why the
suite installs its own browsers rather than using whatever a machine has. No CI
job rewrites them. To change a baseline, run the spec with `--update-snapshots`
on macOS with the pinned browsers, on the http project alone so that the blob
one is still compared against it, and commit the result; or take the `-actual`
image from the `playwright-report-<shard>` artifact CI uploads from the shard
where a comparison failed.
