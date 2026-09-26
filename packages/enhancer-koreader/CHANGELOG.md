# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-koreader





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **navigation:** reader.navigation.readingPosition$ emits
{ cfi, percentageEstimateOfBook } instead of the cfi, and the
readingPosition of @prose-reader/react-native's ReaderState follows it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VuXSQD73D2tabpXXxzCrPG

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
