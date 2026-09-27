# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [21.0.1](https://github.com/mbret/prose-reader/compare/v21.0.0...v21.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

### ⚠ BREAKING CHANGES

* **enhancer-koreader:** `reader.navigation.readingPositionXPointer$` is removed.
  Convert `readingPosition$`'s `cfi` with `reader.koreader.cfiToXPointer`, which
  returns `undefined` for a place in a chapter that is not loaded, or a cfi
  naming nothing in the book. `rxjs` is no longer a peer dependency of
  `@prose-reader/enhancer-koreader`.

### Features

* **enhancer-koreader:** convert a cfi to an xpointer on demand, not the reading position as a stream ([3c8d019](https://github.com/mbret/prose-reader/commit/3c8d019c15056ced3da16f59a49129ccbd174f50))


## [20.0.1](https://github.com/mbret/prose-reader/compare/v20.0.0...v20.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

### ⚠ BREAKING CHANGES

* **navigation:** `ReadingPosition.isFinal` is replaced by
  `ReadingPosition.state`, `"standIn" | "targetPlace" | "final"`;
  `isFinal` is `state === "final"`. The `NavigationAnchor` type is removed:
  a navigation entry's `anchor` is a `ReadingPosition`.

### Features

* **navigation:** give the reading position its state, not only whether it is final ([9f6afe2](https://github.com/mbret/prose-reader/commit/9f6afe280418245824b69ac6fbf0c47fe3ebb887))


## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

### ⚠ BREAKING CHANGES

* **navigation:** a navigation to a cfi reports its chapter's start as the
  reading position until the chapter is loaded, rather than the cfi as asked.
  A cfi whose path leads to nothing in its chapter, or into a spine item
  without a document, is reported as the page it lands on.

### Bug Fixes

* **navigation:** report where the reader is, the same way for every target ([97ba59f](https://github.com/mbret/prose-reader/commit/97ba59fea40adfc27035c425f5c8d810605c1b2c)), closes [#465](https://github.com/mbret/prose-reader/issues/465)


## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **navigation:** reader.navigation.readingPosition$ emits
{ cfi, percentageEstimateOfBook } instead of the cfi, and the
readingPosition of @prose-reader/react-native's ReaderState follows it.

### Features

* **navigation:** report how far into the book the reading position is ([bd3971f](https://github.com/mbret/prose-reader/commit/bd3971fa3bf1730bad14c6d7fcbc38afcbe64bed))



## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [14.1.0](https://github.com/mbret/prose-reader/compare/v14.0.0...v14.1.0) (2026-09-25)


### Features

* **enhancer-koreader:** navigate to xpointers, and report the reading position as one ([aea1d36](https://github.com/mbret/prose-reader/commit/aea1d3680f6159eaa737d14b411509e2dbe9718c))


### Bug Fixes

* **enhancer-koreader:** follow the target option, and pin the reopen report ([dd67cd6](https://github.com/mbret/prose-reader/commit/dd67cd654029fe894b05cbdcec8c26b7a8193133))
* **enhancer-koreader:** require the rxjs it is written against ([2458bc0](https://github.com/mbret/prose-reader/commit/2458bc0cc8e52e733d3d15cff8b1f968dce901d4))
