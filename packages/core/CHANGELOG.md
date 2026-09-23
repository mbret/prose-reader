# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/core





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/core





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** `PagesState` gains `layoutRequest`, which reaches
`reader.layout$` values, and `SpineLayout.layout$` emits the number of
the request it laid out for.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

* refactor(spine): derive layout currency from cancellation instead of numbering requests

Request numbers were there to tell a replaced layout from the current
one, because a request did not cancel what was already running: the
spine layout debounced before its switch, so a pass for an older
request could still finish, and the pages it produced were computed in
a stream that only switched on completed passes.

The wait now sits inside the switch, so a request cancels the pass
still running for an older one, and pages still being computed are
abandoned when a layout is requested. The next pages published after a
request are then the ones it asked for, and `isLayoutCurrent$` follows
from the streams: false from a request, true when pages are next
published. The numbering, the pages' `layoutRequest` field and the
public type change go.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

* fix(spine): count a reader layout as requested before the viewport is measured

`reader.layout()` measures the viewport before it lays the spine out,
and the viewport notifies synchronously, so anything reacting to it
could navigate while the pages still counted as current, and settle on
the layout being replaced. `master` avoided this because the
controller heard `reader.layout()` first; dropping that input for the
spine's own request stream lost it (found in review).

The reader now passes its layout requests to the spine, filtered to
after mount, which is the guard its own pipeline already applied, and
the spine counts them from the moment they are made. Viewport layouts
alone still do not count: zoom re-measures the viewport with the spine
geometry intact, and no spine layout would follow to make the pages
current again.

Tests: a navigation made while a requested layout measures the viewport
does not settle; a viewport-only layout keeps settlement; the enriched
result withdraws while the spine relays out for another item, which
fails on `master` as well.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

### Bug Fixes

* **pagination:** keep settlement only while the layout is current and the page is ready ([#379](https://github.com/mbret/prose-reader/issues/379)) ([d4059dd](https://github.com/mbret/prose-reader/commit/d4059dd1ffe69315481fca7a23deec87bb4d3c17)), closes [#369](https://github.com/mbret/prose-reader/issues/369)



## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** anchor navigation on settled results and drop navigationId (#369)

### Code Refactoring

* **pagination:** anchor navigation on settled results and drop navigationId ([#369](https://github.com/mbret/prose-reader/issues/369)) ([1229ccb](https://github.com/mbret/prose-reader/commit/1229ccb85d7af554a22668275bbd205fe220b4ea))



## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/core





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)

**Note:** Version bump only for package @prose-reader/core





## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/core





## [1.374.2](https://github.com/mbret/prose-reader/compare/v1.374.1...v1.374.2) (2026-09-21)

**Note:** Version bump only for package @prose-reader/core
