# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **core:** `shouldUseSpreadModeForViewport` is removed from
`@prose-reader/core`. Call `reader.viewport.wouldSpreadAt(size)` instead,
which reads the book and the `spreadMode` setting from the reader.
`Context.update` accepts only `rootElement` and `hasVerticalWriting`.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBqLS9PKYZf3fPBLPYkezW

### Features

* **core:** ask the reader about spreads instead of free functions ([33d9b41](https://github.com/mbret/prose-reader/commit/33d9b41e4f28beb762d53da58fdeb296a97872f9))
* **react-reader:** add a layout dialog to the quick menu ([8a3ce75](https://github.com/mbret/prose-reader/commit/8a3ce7517846534fd8832713ca4e350ebd7d2664)), closes [#424](https://github.com/mbret/prose-reader/issues/424)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.3](https://github.com/mbret/prose-reader/compare/v13.0.2...v13.0.3) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **layout:** the `spreadMode` setting is now `"auto" | "always" |
"never"`, defaulting to `"auto"`, instead of a boolean. `"always"` still shows
no spread for a book whose `rendition:spread` is `none`, which the EPUB
specification forbids, or whose `rendition:flow` is `scrolled-continuous`. The
`computedSpreadMode` computed setting is removed: read what the reader shows
from `reader.viewport.value.isSpread`, or follow it with
`reader.viewport.watch("isSpread")`. `shouldEnableSpreadModeForViewport` and
`shouldUseComputedSpreadModeForViewport` are replaced by
`shouldUseSpreadModeForViewport`, which takes the setting. react-reader's
`wouldRotationUseComputedSpreadMode` is renamed
`wouldRotationUseSpreadMode` and takes the setting too.


Claude-Session: https://claude.ai/code/session_01DBqLS9PKYZf3fPBLPYkezW

Co-authored-by: Claude <noreply@anthropic.com>

### Bug Fixes

* **layout:** decide spread mode in the viewport's layout, so a resize that switches it lays out once ([#398](https://github.com/mbret/prose-reader/issues/398)) ([260c332](https://github.com/mbret/prose-reader/commit/260c33205f9ef066515b8044856bd88bf325bcff))



## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-reader





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.1](https://github.com/mbret/prose-reader/compare/v2.0.0...v2.0.1) (2026-09-22)


### Bug Fixes

* **build:** annotate the exported types declaration emit cannot infer, and reattach the apps to the workspace ([#371](https://github.com/mbret/prose-reader/issues/371)) ([6091f84](https://github.com/mbret/prose-reader/commit/6091f84d77e267cd07afef0d37257f24c20f0758))



## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-reader





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/react-reader
