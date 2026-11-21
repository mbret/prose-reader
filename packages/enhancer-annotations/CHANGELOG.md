# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [46.1.0](https://github.com/mbret/prose-reader/compare/v46.0.0...v46.1.0) (2026-11-21)

### Features

* **enhancer-annotations:** give a new highlight the text of its range ([2cf68ed](https://github.com/mbret/prose-reader/commit/2cf68eda62efd3653bee4ee7d9b2a2078783f4c6))

### Bug Fixes

* **enhancer-annotations:** keep a drop cap and an image apart from the lines of text ([0e2e164](https://github.com/mbret/prose-reader/commit/0e2e164b779105a82557fbd839e22f4b8796180b))
* **enhancer-annotations:** paint the lines of a highlight's text, not the boxes of the elements it covers ([fdc3fee](https://github.com/mbret/prose-reader/commit/fdc3fee204fb755e98d476b217c7b97aa8e838ec)), references [#718](https://github.com/mbret/prose-reader/issues/718)


## [46.0.0](https://github.com/mbret/prose-reader/compare/v45.0.0...v46.0.0) (2026-11-21)

### ⚠ BREAKING CHANGES

* **enhancer-annotations:** `AnnotateParams` is renamed `AnnotateSelectionParams`,
  and its `selection` is required. `AnnotateAbsolutePageParams` no longer
  takes a `selection`. `createAnnotation` returns `undefined` for a
  selection that holds no range.
* **enhancer-annotations:** `createAnnotation` no longer takes `highlightColor`,
  `notes` or `selected`. It returns `{ id, cfi }`, typed
  `Pick<Annotation, "id" | "cfi">`. Add your other fields, such as
  `highlightColor` and `notes`, to the result. The result no longer holds
  `itemIndex` or any other property of the parameter. react-reader's
  `onAnnotationCreate` no longer receives `itemIndex`, `type`, `event` or
  `absolutePageIndex`.
* **enhancer-annotations:** `reader.annotations.highlightTap$` emits
  `{ event, annotation }` in place of `{ event, highlight }`. Read
  `annotation` where you read `highlight`.

  Part of [#835](https://github.com/mbret/prose-reader/issues/835), defects 1 and 2.
* every `@prose-reader/*` package is published as an ES module only. The CommonJS builds (`dist/**/*.cjs`) are removed, and every package declares `engines.node >=22.12`.

  - With `import` or a bundler, Metro included, no change is necessary.
  - On Node.js 22.12 or later, `require()` loads the ES module build.
  - On an older Node.js, use `await import()`, or convert the file to an ES module.
  - In TypeScript, an ES module file resolves the types from TypeScript 5.0, with `bundler`, `node16` or `nodenext` resolution. A CommonJS file needs `"module": "nodenext"` and TypeScript 5.8 or later. Under `node16`, use `await import()`, or convert the file to an ES module.
  - If a test runner loads modules with its own CommonJS loader, for example Jest without ES module support, transform `@prose-reader/*` or enable ES module support in the runner.
  - The `module` field, and the `react-native` field of `@prose-reader/react-native`, are removed. Both named the same file as `main`, which tools read instead.

### Features

* **enhancer-annotations:** give the annotations of each page ([e21fa18](https://github.com/mbret/prose-reader/commit/e21fa187f70fc05c9a616ccc600762c52b09dbe0)), references [#718](https://github.com/mbret/prose-reader/issues/718) [#835](https://github.com/mbret/prose-reader/issues/835)

### Bug Fixes

* compare annotations by content in the pages stream, and test a highlight before a bookmark ([6da6718](https://github.com/mbret/prose-reader/commit/6da67186c494671a31f7ab1c8a2c95b223ea67b9)), references [#718](https://github.com/mbret/prose-reader/issues/718) [#835](https://github.com/mbret/prose-reader/issues/835)
* **enhancer-annotations:** annotate a selection or a page, and nothing without a range ([0ece142](https://github.com/mbret/prose-reader/commit/0ece142f4524ad9467bedb17a4f0b843459c3aec)), references [#835](https://github.com/mbret/prose-reader/issues/835)
* **enhancer-annotations:** clear a highlight whose cfi is no longer a range ([fcb0d83](https://github.com/mbret/prose-reader/commit/fcb0d839fe04a86fcadfb1eca6bda2b2c9e3d4f8))
* **enhancer-annotations:** complete `highlightTap$` when the reader is destroyed ([03febdd](https://github.com/mbret/prose-reader/commit/03febdd867ae316b1d0af129cf3c9d496320f51d)), references [#835](https://github.com/mbret/prose-reader/issues/835)
* **enhancer-annotations:** draw highlights without a tap subscriber, and remove them when their annotation leaves the list ([65ffa1c](https://github.com/mbret/prose-reader/commit/65ffa1c8fb021d6c2c54afdff95ae6f303cf8356)), closes [#835](https://github.com/mbret/prose-reader/issues/835), references [#718](https://github.com/mbret/prose-reader/issues/718)
* **enhancer-annotations:** find the tapped highlight of a reader mounted in a frame ([b13c313](https://github.com/mbret/prose-reader/commit/b13c313530e6579ae3231c14a5c83517257ec705)), references [#835](https://github.com/mbret/prose-reader/issues/835)
* **enhancer-annotations:** keep the two forms of createAnnotation apart ([b77a123](https://github.com/mbret/prose-reader/commit/b77a123b5870891bff79e9030b3aad26f0905abf)), references [#835](https://github.com/mbret/prose-reader/issues/835)
* **enhancer-annotations:** return only the id and cfi from createAnnotation ([2a3febe](https://github.com/mbret/prose-reader/commit/2a3febe7187e5d08e5323b0d7f16551ad49e79f7)), references [#835](https://github.com/mbret/prose-reader/issues/835) [#718](https://github.com/mbret/prose-reader/issues/718)
* ship ES modules only, and check every published package's types ([88122a6](https://github.com/mbret/prose-reader/commit/88122a6393a41e8b55b775c5507443a0c0ca72e7))

### Performance Improvements

* **enhancer-annotations:** resolve the cfi of a highlight once per document ([a68240d](https://github.com/mbret/prose-reader/commit/a68240d0715a73f4b079ea95f6cc29217c581f87))

### Code Refactoring

* **enhancer-annotations:** report the taps on highlights from their layer, as `annotation` ([29e2a65](https://github.com/mbret/prose-reader/commit/29e2a659b463039cd5e09bc076a47c6f083edeed)), references [#835](https://github.com/mbret/prose-reader/issues/835)


## [45.0.0](https://github.com/mbret/prose-reader/compare/v44.0.0...v45.0.0) (2026-11-16)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [44.0.0](https://github.com/mbret/prose-reader/compare/v43.0.0...v44.0.0) (2026-11-14)

### Bug Fixes

* **enhancer-annotations:** emit an empty candidates$ before the first pages ([6fdc764](https://github.com/mbret/prose-reader/commit/6fdc7645891d66870d764f8e988e71013ca90edb))


## [43.0.0](https://github.com/mbret/prose-reader/compare/v42.0.0...v43.0.0) (2026-11-11)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [42.0.0](https://github.com/mbret/prose-reader/compare/v41.0.0...v42.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [41.0.0](https://github.com/mbret/prose-reader/compare/v40.0.0...v41.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [40.0.0](https://github.com/mbret/prose-reader/compare/v39.0.0...v40.0.0) (2026-11-05)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [39.0.0](https://github.com/mbret/prose-reader/compare/v38.0.1...v39.0.0) (2026-11-04)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [38.0.1](https://github.com/mbret/prose-reader/compare/v38.0.0...v38.0.1) (2026-11-03)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [38.0.0](https://github.com/mbret/prose-reader/compare/v37.0.0...v38.0.0) (2026-11-02)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [37.0.0](https://github.com/mbret/prose-reader/compare/v36.0.0...v37.0.0) (2026-11-02)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [36.0.0](https://github.com/mbret/prose-reader/compare/v35.0.1...v36.0.0) (2026-10-29)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [35.0.0](https://github.com/mbret/prose-reader/compare/v34.0.0...v35.0.0) (2026-10-28)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [34.0.0](https://github.com/mbret/prose-reader/compare/v33.0.0...v34.0.0) (2026-10-24)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [33.0.0](https://github.com/mbret/prose-reader/compare/v32.0.0...v33.0.0) (2026-10-23)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [32.0.0](https://github.com/mbret/prose-reader/compare/v31.0.0...v32.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [31.0.0](https://github.com/mbret/prose-reader/compare/v30.3.0...v31.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [30.2.0](https://github.com/mbret/prose-reader/compare/v30.1.2...v30.2.0) (2026-10-20)

### Features

* **core:** give a spine item's loaded document ([689e50d](https://github.com/mbret/prose-reader/commit/689e50d7dd3b4a04ca32e5ab38c9e70ea370aee9))


## [30.1.1](https://github.com/mbret/prose-reader/compare/v30.1.0...v30.1.1) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [30.0.0](https://github.com/mbret/prose-reader/compare/v29.0.0...v30.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [29.0.0](https://github.com/mbret/prose-reader/compare/v28.2.0...v29.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [28.0.0](https://github.com/mbret/prose-reader/compare/v27.0.0...v28.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [27.0.0](https://github.com/mbret/prose-reader/compare/v26.0.0...v27.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [26.0.0](https://github.com/mbret/prose-reader/compare/v25.1.0...v26.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [25.1.0](https://github.com/mbret/prose-reader/compare/v25.0.1...v25.1.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [25.0.1](https://github.com/mbret/prose-reader/compare/v25.0.0...v25.0.1) (2026-10-10)

### Bug Fixes

* declare the MIT license in every published package ([fefd424](https://github.com/mbret/prose-reader/commit/fefd424c2bf8aba9e925ffb1022fa9ef3a08b15d))


## [25.0.0](https://github.com/mbret/prose-reader/compare/v24.0.0...v25.0.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





## [24.0.0](https://github.com/mbret/prose-reader/compare/v23.0.0...v24.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-annotations





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
