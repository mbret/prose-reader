# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

### ⚠ BREAKING CHANGES

* **navigation:** ReadingPosition gains `isFinal`, which code building one
  must set. readingPosition$ emits once more when a value becomes final, even
  with the same cfi and progress.

### Features

* **navigation:** say whether the reading position is final ([49ed7f2](https://github.com/mbret/prose-reader/commit/49ed7f222bf217117cf3fae89733245b1af51f44))

### Bug Fixes

* **navigation:** stop a selector waiting for a document its item never gets ([e697b87](https://github.com/mbret/prose-reader/commit/e697b879f2bb6f9061e5e3d2b8a1290c324f90f1))


## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/core





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/core





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/core





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **cfi:** parse throws for strings it used to read in part, such as
a cfi with text after its closing parenthesis or without one, or with a
step or an offset missing its number.
* **navigation:** a navigation to a spine item the book does not have is
ignored rather than clamped to its first or last item, and a navigation
to an empty cfi is ignored rather than going to the first item.

### Bug Fixes

* **cfi:** throw for a string that is only partly a cfi ([a071e27](https://github.com/mbret/prose-reader/commit/a071e27d351cd807139fd9bfa9a0644a95c6dfef))
* **navigation:** ignore a navigation whose target names nothing in the book ([5203b99](https://github.com/mbret/prose-reader/commit/5203b99cab0cf2564a369e3dfa5c121d50534317)), closes [#465](https://github.com/mbret/prose-reader/issues/465)



## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **navigation:** reader.navigation.readingPosition$ emits
{ cfi, percentageEstimateOfBook } instead of the cfi, and the
readingPosition of @prose-reader/react-native's ReaderState follows it.

### Features

* **navigation:** report how far into the book the reading position is ([bd3971f](https://github.com/mbret/prose-reader/commit/bd3971fa3bf1730bad14c6d7fcbc38afcbe64bed))


### Bug Fixes

* **core:** keep progression estimates within the book whatever the weights ([fca46fa](https://github.com/mbret/prose-reader/commit/fca46fa5fa85b4abc2b32b0d69b5307e82b5d057))
* **navigation:** take a target's progression from the page holding it ([e3b5681](https://github.com/mbret/prose-reader/commit/e3b5681e09b4d5e70b5e90a1b753818fbb4a01c7))



## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/core





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **core:** `shouldUseSpreadModeForViewport` is removed from
`@prose-reader/core`. Call `reader.viewport.wouldSpreadAt(size)` instead,
which reads the book and the `spreadMode` setting from the reader.
`Context.update` accepts only `rootElement` and `hasVerticalWriting`.

### Features

* **core:** ask the reader about spreads instead of free functions ([33d9b41](https://github.com/mbret/prose-reader/commit/33d9b41e4f28beb762d53da58fdeb296a97872f9))


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **core:** the `cfi` option of `createReader` is removed. Pass
`target: { type: "cfi", value: cfi }` instead. `ReaderLoadOptions` of
`@prose-reader/react-native` takes `target` in place of `cfi` the same way.

### Features

* **core:** open the reader at any navigation target ([370d3c2](https://github.com/mbret/prose-reader/commit/370d3c2a1cd5017f9b4fb38d70bf31ed44306e79))



## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)


### Bug Fixes

* **core:** open at the initial cfi without reporting the start of the book ([fd1ea00](https://github.com/mbret/prose-reader/commit/fd1ea00a6d7e8384d1f73a0090ec8c1f26ac1ef9))



## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/core





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)


### Bug Fixes

* **gestures:** make the drag listener the only thing stopping the browser's own drag ([a9e23d7](https://github.com/mbret/prose-reader/commit/a9e23d756c671bee2ea7fa08c2f296bb47485928))



## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/core





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **navigation:** the core `NavigationTarget` no longer has `url`; the reader
`createReader` returns still takes it, through the url enhancer. `node` is a
new target type. After `goToUrl` to an element, the reading position is that
element's cfi rather than the first character of its page. A url outside the
book is ignored instead of going to the first item.

### Bug Fixes

* **navigation:** keep a selector waiting for its document without an anchor ([f6a33d4](https://github.com/mbret/prose-reader/commit/f6a33d463608f3b5090932214de0c725f28b6a4f))
* **navigation:** state what a selector may assume, and survive one that throws ([7ac3133](https://github.com/mbret/prose-reader/commit/7ac3133d92248ff38ddf10cd99accef404506f74))


### Code Refactoring

* **navigation:** move url navigation into a core enhancer, on a generic node target ([e4b2a22](https://github.com/mbret/prose-reader/commit/e4b2a22155ad652989bfdd87926344da159971b9))



## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **navigation:** UserNavigationEntry.direction is removed, and
InternalNavigationEntry.directionFromLastNavigation no longer includes
"anchor".

### Bug Fixes

* **core:** keep a forwarded pointer event's button, pointer and modifier keys ([aed8733](https://github.com/mbret/prose-reader/commit/aed873386471eef52a57d4a80ee90a9c9de035e5)), closes [#240](https://github.com/mbret/prose-reader/issues/240) [#240](https://github.com/mbret/prose-reader/issues/240)


### Code Refactoring

* **navigation:** resolve targets in one step, in a fixed consolidation order ([#436](https://github.com/mbret/prose-reader/issues/436)) ([912b9a3](https://github.com/mbret/prose-reader/commit/912b9a3966cde3ed5835d9a2ca736785308f73cf))



## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **navigation:** ask for one typed target per navigation (#434)

### Code Refactoring

* **navigation:** ask for one typed target per navigation ([#434](https://github.com/mbret/prose-reader/issues/434)) ([62b9d52](https://github.com/mbret/prose-reader/commit/62b9d5220546533c4d2eb29037d74533c6d4c033))



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

### Bug Fixes

* **layout:** decide spread mode in the viewport's layout, so a resize that switches it lays out once ([#398](https://github.com/mbret/prose-reader/issues/398)) ([260c332](https://github.com/mbret/prose-reader/commit/260c33205f9ef066515b8044856bd88bf325bcff))



## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/core





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/core





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **navigation:** `paginationBeginCfi` is removed from navigation entries and
`"pagination"` from `triggeredBy`; `navigation$` emits every restoration;
`EnhancerPaginationInto` is renamed `EnhancerPaginationInfo`.

### Code Refactoring

* **navigation:** derive the reading position and resolve pagination on navigations only ([#392](https://github.com/mbret/prose-reader/issues/392)) ([5f34d62](https://github.com/mbret/prose-reader/commit/5f34d624bbc63ad28dbf4d23f4edc07699ba2485)), closes [#390](https://github.com/mbret/prose-reader/issues/390)



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
