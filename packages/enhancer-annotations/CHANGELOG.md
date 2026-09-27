# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [23.0.0](https://github.com/mbret/prose-reader/compare/v22.0.2...v23.0.0) (2026-09-27)

### ⚠ BREAKING CHANGES

* **core:** `SpineItemState.isLoaded` and `isError` are replaced by
  `loadStatus: DocumentLoadStatus`, `"idle" | "loading" | "loaded" |
  "unloading" | "error"`: `isLoaded` is `loadStatus === "loaded"` and `isError`
  is `loadStatus === "error"`. A renderer's `state` is renamed `loadStatus`.
  `SpineItemsObserver.itemLoad$`, `itemUnload$` and `itemLoadFailure$` are
  replaced by `itemLoadStatusChange$`, emitting `{ item, loadStatus }`.
  `SpineItem.loaded$` and `unloaded$`, and `DocumentRenderer.loaded$`,
  `unloaded$` and `isLoaded$`, are removed: watch `loadStatus` instead.

### Bug Fixes

* **core:** lay out after a load status reaches every subscriber, on load ends only ([6a299d2](https://github.com/mbret/prose-reader/commit/6a299d2ed23a55c1300f07947b62b534f574b100))

### Code Refactoring

* **core:** one load status for a spine item, not two flags and three streams ([a5656f8](https://github.com/mbret/prose-reader/commit/a5656f88e63d42ab8bc20b655c3a24588942c003))


## [22.0.2](https://github.com/mbret/prose-reader/compare/v22.0.1...v22.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [22.0.1](https://github.com/mbret/prose-reader/compare/v22.0.0...v22.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [22.0.0](https://github.com/mbret/prose-reader/compare/v21.0.2...v22.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [21.0.2](https://github.com/mbret/prose-reader/compare/v21.0.1...v21.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [21.0.1](https://github.com/mbret/prose-reader/compare/v21.0.0...v21.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [20.0.1](https://github.com/mbret/prose-reader/compare/v20.0.0...v20.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/enhancer-annotations
