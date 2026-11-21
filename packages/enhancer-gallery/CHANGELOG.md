# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [46.0.0](https://github.com/mbret/prose-reader/compare/v45.0.0...v46.0.0) (2026-11-21)

### ⚠ BREAKING CHANGES

* every `@prose-reader/*` package is published as an ES module only. The CommonJS builds (`dist/**/*.cjs`) are removed, and every package declares `engines.node >=22.12`.

  - With `import` or a bundler, Metro included, no change is necessary.
  - On Node.js 22.12 or later, `require()` loads the ES module build.
  - On an older Node.js, use `await import()`, or convert the file to an ES module.
  - In TypeScript, an ES module file resolves the types from TypeScript 5.0, with `bundler`, `node16` or `nodenext` resolution. A CommonJS file needs `"module": "nodenext"` and TypeScript 5.8 or later. Under `node16`, use `await import()`, or convert the file to an ES module.
  - If a test runner loads modules with its own CommonJS loader, for example Jest without ES module support, transform `@prose-reader/*` or enable ES module support in the runner.
  - The `module` field, and the `react-native` field of `@prose-reader/react-native`, are removed. Both named the same file as `main`, which tools read instead.

### Bug Fixes

* ship ES modules only, and check every published package's types ([88122a6](https://github.com/mbret/prose-reader/commit/88122a6393a41e8b55b775c5507443a0c0ca72e7))


## [45.0.0](https://github.com/mbret/prose-reader/compare/v44.0.0...v45.0.0) (2026-11-16)

### ⚠ BREAKING CHANGES

* **core:** `SpineItem.numberOfPages` is removed. Read
  `spineItem.pageGeometry.numberOfPages`. `reader.spine.locator` no
  longer has `spineItemLocator` or
  `getSafeSpineItemPositionFromUnsafeSpineItemPosition`.
  `reader.navigation.navigationResolver` no longer has
  `spineItemNavigator`. The `Spine` and `Pages` constructors no longer
  take the item locator.

### Code Refactoring

* **core:** give each spine item one model of its pages ([b453353](https://github.com/mbret/prose-reader/commit/b453353d3497fec1484e982eba70703080c378cb))


## [44.0.0](https://github.com/mbret/prose-reader/compare/v43.0.0...v44.0.0) (2026-11-14)

### ⚠ BREAKING CHANGES

* **deps:** @prose-reader/react-reader needs reactjrx 6: its
  reactjrx peer is `6.x`. @prose-reader/react-native needs Expo SDK 58:
  its expo-file-system peer is `^58.0.0`.

### Build System

* **deps:** upgrade reactjrx to 6, Expo to SDK 58 and the other dependencies ([8b41a66](https://github.com/mbret/prose-reader/commit/8b41a66f69c7d78924eea0ff8bf199a009ad3a47))


## [43.0.0](https://github.com/mbret/prose-reader/compare/v42.0.0...v43.0.0) (2026-11-11)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [42.0.0](https://github.com/mbret/prose-reader/compare/v41.0.0...v42.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [41.0.0](https://github.com/mbret/prose-reader/compare/v40.0.0...v41.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [40.0.0](https://github.com/mbret/prose-reader/compare/v39.0.0...v40.0.0) (2026-11-05)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [39.0.0](https://github.com/mbret/prose-reader/compare/v38.0.1...v39.0.0) (2026-11-04)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [38.0.1](https://github.com/mbret/prose-reader/compare/v38.0.0...v38.0.1) (2026-11-03)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [38.0.0](https://github.com/mbret/prose-reader/compare/v37.0.0...v38.0.0) (2026-11-02)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [37.0.0](https://github.com/mbret/prose-reader/compare/v36.0.0...v37.0.0) (2026-11-02)

### ⚠ BREAKING CHANGES

* **core:** `reader.theme` (`set`, `get`, `$.theme$`) and the
  `ThemeEnhancerOutput` type are removed. Use `reader.settings` instead.

### Features

* **core:** make the theme a reader setting ([e02ffbf](https://github.com/mbret/prose-reader/commit/e02ffbfe3ed86e6f1049e6a12b535545966b1f25))


## [36.0.0](https://github.com/mbret/prose-reader/compare/v35.0.1...v36.0.0) (2026-10-29)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [35.0.0](https://github.com/mbret/prose-reader/compare/v34.0.0...v35.0.0) (2026-10-28)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [34.0.0](https://github.com/mbret/prose-reader/compare/v33.0.0...v34.0.0) (2026-10-24)

### ⚠ BREAKING CHANGES

* **deps:** `@prose-reader/core` is now a peer dependency of
  `@prose-reader/enhancer-gallery`, `enhancer-audio`, `enhancer-gestures`
  and `enhancer-search`. Install the core the enhancer was released with,
  or a later one of the same major: npm refuses to install the enhancer
  next to any other, and pnpm and yarn report an unmet peer, where a
  second core used to be installed.
* **core:** the reader no longer exposes its spine items loader,
  `reader.spine.spineItemsLoader` in 32.x. Call
  `reader.keepSpineItemLoaded(spineItem)` for each spine item instead of
  its `forceOpen(spineItems)`: it takes an index, an id or a SpineItem,
  and its release releases once however many times it is called.
  `reader.destroy()` destroys the loader.

### Bug Fixes

* **deps:** make @prose-reader/core a peer of the gallery, audio, gestures and search enhancers ([8591888](https://github.com/mbret/prose-reader/commit/8591888fa3b9bdd07100e75a02cbab6e49279321)), references [#597](https://github.com/mbret/prose-reader/issues/597)

### Code Refactoring

* **core:** replace reader.spineItemsLoader with reader.keepSpineItemLoaded() ([2c40b04](https://github.com/mbret/prose-reader/commit/2c40b04d4d2996a02bbaa01e068b56adf208be93))


## [33.0.0](https://github.com/mbret/prose-reader/compare/v32.0.0...v33.0.0) (2026-10-23)

### ⚠ BREAKING CHANGES

* **core:** `reader.spine.spineItemsLoader` is now
  `reader.spineItemsLoader`. `reader.context.bridgeEvent` no longer carries
  `navigation$`, `position$` and `pagination$`, nor their subjects: read
  `reader.navigation.navigation$`, `reader.navigation.position$` and
  `reader.pagination.state$`. The `Spine` constructor no longer takes a
  `Pagination`.

### Features

* **core:** export the background each theme paints ([15777de](https://github.com/mbret/prose-reader/commit/15777ded1e157612a81f21f251b3d66022170ecb))

### Bug Fixes

* **enhancer-gallery:** paint the reader's theme behind a snapshot's page ([fb90d5f](https://github.com/mbret/prose-reader/commit/fb90d5f923fb5b69d12ed736986238f46031ebce))

### Code Refactoring

* **core:** let the navigator own which navigation holds on the current layout ([0c102de](https://github.com/mbret/prose-reader/commit/0c102dee8e542a4fbcdadca0f85bde4d1569d262)), closes [#596](https://github.com/mbret/prose-reader/issues/596)


## [32.0.0](https://github.com/mbret/prose-reader/compare/v31.0.0...v32.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [31.0.0](https://github.com/mbret/prose-reader/compare/v30.3.0...v31.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [30.2.0](https://github.com/mbret/prose-reader/compare/v30.1.2...v30.2.0) (2026-10-20)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [30.1.1](https://github.com/mbret/prose-reader/compare/v30.1.0...v30.1.1) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [30.0.0](https://github.com/mbret/prose-reader/compare/v29.0.0...v30.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [29.0.0](https://github.com/mbret/prose-reader/compare/v28.2.0...v29.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [28.0.0](https://github.com/mbret/prose-reader/compare/v27.0.0...v28.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [27.0.0](https://github.com/mbret/prose-reader/compare/v26.0.0...v27.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [26.0.0](https://github.com/mbret/prose-reader/compare/v25.1.0...v26.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [25.1.0](https://github.com/mbret/prose-reader/compare/v25.0.1...v25.1.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [25.0.1](https://github.com/mbret/prose-reader/compare/v25.0.0...v25.0.1) (2026-10-10)

### Bug Fixes

* declare the MIT license in every published package ([fefd424](https://github.com/mbret/prose-reader/commit/fefd424c2bf8aba9e925ffb1022fa9ef3a08b15d))


## [25.0.0](https://github.com/mbret/prose-reader/compare/v24.0.0...v25.0.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [24.0.0](https://github.com/mbret/prose-reader/compare/v23.0.0...v24.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [23.0.0](https://github.com/mbret/prose-reader/compare/v22.0.2...v23.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [22.0.2](https://github.com/mbret/prose-reader/compare/v22.0.1...v22.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [22.0.1](https://github.com/mbret/prose-reader/compare/v22.0.0...v22.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [22.0.0](https://github.com/mbret/prose-reader/compare/v21.0.2...v22.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [21.0.2](https://github.com/mbret/prose-reader/compare/v21.0.1...v21.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [21.0.1](https://github.com/mbret/prose-reader/compare/v21.0.0...v21.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [20.0.1](https://github.com/mbret/prose-reader/compare/v20.0.0...v20.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-gallery





## [1.374.2](https://github.com/mbret/prose-reader/compare/v1.374.1...v1.374.2) (2026-09-21)

**Note:** Version bump only for package @prose-reader/enhancer-gallery
