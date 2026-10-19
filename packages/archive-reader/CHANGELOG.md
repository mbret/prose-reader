# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [29.0.0](https://github.com/mbret/prose-reader/compare/v28.2.0...v29.0.0) (2026-10-19)

### ⚠ BREAKING CHANGES

* **archive-reader:** `getArchiveOpfInfo(archive)`, which returned the first
  `.opf` record as `{ data, basePath }`, is replaced by the asynchronous
  `getArchiveOpfRecord(archive)`, which returns the record of the package
  document the container file lists. `readArchiveOpf(archive)` still
  gives the parsed package document with its `basePath`.

### Bug Fixes

* **archive-reader:** leave out a container file's elements of other namespaces ([ddd22c4](https://github.com/mbret/prose-reader/commit/ddd22c47819e6280d3289ae9466824b659fc6142))
* **archive-reader:** read the package document the container file lists ([1c7145a](https://github.com/mbret/prose-reader/commit/1c7145aeee46b978e80b9e0216372e9732e94b35))


## [28.1.0](https://github.com/mbret/prose-reader/compare/v28.0.0...v28.1.0) (2026-10-19)

### Features

* **archive-reader:** export the resolution of a book's references ([6526b47](https://github.com/mbret/prose-reader/commit/6526b47fc05ad5432ed2af2d66cac5aaa03ec3e9))


## [28.0.0](https://github.com/mbret/prose-reader/compare/v27.0.0...v28.0.0) (2026-10-19)

### ⚠ BREAKING CHANGES

* **archive-reader:** `getSpineItemFilesFromArchive` is removed from
  `@prose-reader/archive-reader`. Resolve the reading order with
  `resolveArchiveReadingOrder(archive)` and find each item's record with
  `getArchiveFileRecordByUri(archive, item.uri)`.

### Bug Fixes

* **archive-reader:** find the nav document and the NCX by their record ([cbb391b](https://github.com/mbret/prose-reader/commit/cbb391b2edf2dcc7a816af6429f18d48827bfe3a))
* **archive-reader:** keep a reference's query and fragment out of its path ([939001f](https://github.com/mbret/prose-reader/commit/939001f92a7339f4775771ea2cca1ebed0c4f209))
* **archive-reader:** resolve escaped dot segments as a browser does ([07b9cd6](https://github.com/mbret/prose-reader/commit/07b9cd6d09970b20b5227d68a089e9c67296fdd2))
* **archive-reader:** resolve the dot segments of toc links ([7dbdae7](https://github.com/mbret/prose-reader/commit/7dbdae71229748c77cd40adb398ee84afd11ed47))

### Code Refactoring

* **archive-reader:** remove getSpineItemFilesFromArchive ([a21d1fe](https://github.com/mbret/prose-reader/commit/a21d1fe0bbeff2528874250b3b7bae0234fa18ac))


## [27.0.0](https://github.com/mbret/prose-reader/compare/v26.0.0...v27.0.0) (2026-10-19)

### Bug Fixes

* **archive-reader:** resolve an escaped href to the record it names ([36886cf](https://github.com/mbret/prose-reader/commit/36886cf05007bcb816ed35139f58c172c3f04d61))


## [26.0.0](https://github.com/mbret/prose-reader/compare/v25.1.0...v26.0.0) (2026-10-19)

### Features

* **archive-reader:** resolve the media type of the book file ([cfd4a08](https://github.com/mbret/prose-reader/commit/cfd4a08e56a06633c4cc2d97c5f427be39c4a7f8))


## [25.1.0](https://github.com/mbret/prose-reader/compare/v25.0.1...v25.1.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/archive-reader





## [25.0.0](https://github.com/mbret/prose-reader/compare/v24.0.0...v25.0.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/archive-reader





## [24.0.0](https://github.com/mbret/prose-reader/compare/v23.0.0...v24.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/archive-reader





## [23.0.0](https://github.com/mbret/prose-reader/compare/v22.0.2...v23.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/archive-reader





## [22.0.0](https://github.com/mbret/prose-reader/compare/v21.0.2...v22.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/archive-reader





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/archive-reader





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/archive-reader





## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/archive-reader





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/archive-reader





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/archive-reader





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/archive-reader





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/archive-reader





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/archive-reader





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/archive-reader





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/archive-reader





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/archive-reader





## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)


### ⚠ BREAKING CHANGES

* **deps:** consumers reaching these packages through `require()`
now need Node >=22.12, where `require(esm)` landed unflagged. `import`
is unaffected on any Node that runs them, as is any bundler build.
Documented on the streamer's Node page.

### Features

* **deps:** upgrade xmldoc to 3.x ([#370](https://github.com/mbret/prose-reader/issues/370)) ([1d06cbe](https://github.com/mbret/prose-reader/commit/1d06cbe375e1a16f087e9a00d96a9767adec3e8d))
