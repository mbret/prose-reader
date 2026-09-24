# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)


### Bug Fixes

* **core:** stop a link the browser never fetches from holding its chapter ([#406](https://github.com/mbret/prose-reader/issues/406)) ([aaa698d](https://github.com/mbret/prose-reader/commit/aaa698da564939f3ce4b221927ade2f6290367b4)), closes [#400](https://github.com/mbret/prose-reader/issues/400)



## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/core





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)


### Bug Fixes

* **zoom:** lay the reader out when zooming instead of only re-measuring the viewport ([#399](https://github.com/mbret/prose-reader/issues/399)) ([4e0fe57](https://github.com/mbret/prose-reader/commit/4e0fe57358bd7446dfc7e0e539744795635ecfaf))



## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)


### Bug Fixes

* **layout:** stop laying out after every settings change, and lay out for the settings that move the pages ([#387](https://github.com/mbret/prose-reader/issues/387)) ([c1808cf](https://github.com/mbret/prose-reader/commit/c1808cfdbf94f1894cd5c701f7385168bef9561c))



## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **navigation:** `reader.navigation.state$` no longer emits `canTurnLeft`
and `canTurnRight`.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrAJRJ7bRywuXZwwLMJupc

* test(navigation): annotate state fixtures instead of asserting them

The fixtures were narrowed with `as const`. An annotation against the
helper's parameter type is as short, checks each fixture where it is
declared, and leaves no assertion for the repository's `as` policy to ask
about.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrAJRJ7bRywuXZwwLMJupc

### Code Refactoring

* **navigation:** drop canTurnLeft and canTurnRight from the navigation state ([#393](https://github.com/mbret/prose-reader/issues/393)) ([b441ae6](https://github.com/mbret/prose-reader/commit/b441ae6c3d4b88d5fdea93dd8183e9d26a68ae57))



## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** `EnhancerPaginationInto` is renamed `EnhancerPaginationInfo`.
`ChapterInfo` is now recursive: the toc has no depth limit, and the builder
already produced chains deeper than the four hand-unrolled levels the type
described, through casts.

### Documentation

* **pagination:** document the pagination surface that exists ([#391](https://github.com/mbret/prose-reader/issues/391)) ([46a0e14](https://github.com/mbret/prose-reader/commit/46a0e14adc646ab7e813d0a7550383bd8cd19e89)), closes [#390](https://github.com/mbret/prose-reader/issues/390)



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
