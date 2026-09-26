# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/streamer





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/streamer





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/streamer





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/streamer





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/streamer





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/streamer





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/streamer





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/streamer





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/streamer





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/streamer





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/streamer





## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)


### ⚠ BREAKING CHANGES

* **deps:** consumers reaching these packages through `require()`
now need Node >=22.12, where `require(esm)` landed unflagged. `import`
is unaffected on any Node that runs them, as is any bundler build.
Documented on the streamer's Node page.

Verified: full build, `npm run tsc`, 1311 unit tests, and the e2e suite
at 39/39 on a real browser. `require()` of the built CJS bundles still
loads and parses. The react-native demo's own CI steps — `npm ci` against
the regenerated lockfile, then `tsc` — both pass.

Not verified: Metro actually bundling the ESM-only package. `expo export`
cannot run here — it fails resolving the `file:`-linked
`@prose-reader/react-native` symlink, before reaching any xmldoc code, so
the limitation is pre-existing and unrelated to this change. CI only
typechecks that demo, so it will not cover this either; the native path
is worth a manual bundle before relying on it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBqLS9PKYZf3fPBLPYkezW

* fix(deps): declare the Node floor the xmldoc upgrade introduces

xmldoc declares `engines: node >=22`, but that is not the floor for
packages that reach it through a CommonJS entry: unflagged `require(esm)`
only landed in Node 22.12. On 22.0–22.11 npm accepts the install and the
failure surfaces later, when a consumer first calls `require()`.

Declare `engines: node >=22.12` on the three packages that depend on
xmldoc so the mismatch is reported at install time instead.

Repeat the requirement on the archive-reader and metadata-fetcher pages
too. It was only on the streamer's Node page, and those two are
documented and consumed as standalone packages whose pages do not link
there, so their readers would not have seen it.

Both reported by Codex review.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBqLS9PKYZf3fPBLPYkezW

### Features

* **deps:** upgrade xmldoc to 3.x ([#370](https://github.com/mbret/prose-reader/issues/370)) ([1d06cbe](https://github.com/mbret/prose-reader/commit/1d06cbe375e1a16f087e9a00d96a9767adec3e8d))
