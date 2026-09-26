# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **navigation:** reader.navigation.readingPosition$ emits
{ cfi, percentageEstimateOfBook } instead of the cfi, and the
readingPosition of @prose-reader/react-native's ReaderState follows it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VuXSQD73D2tabpXXxzCrPG

### Features

* **navigation:** report how far into the book the reading position is ([bd3971f](https://github.com/mbret/prose-reader/commit/bd3971fa3bf1730bad14c6d7fcbc38afcbe64bed))


### Bug Fixes

* **core:** keep progression estimates within the book whatever the weights ([fca46fa](https://github.com/mbret/prose-reader/commit/fca46fa5fa85b4abc2b32b0d69b5307e82b5d057))



## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-native





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **core:** the `cfi` option of `createReader` is removed. Pass
`target: { type: "cfi", value: cfi }` instead. `ReaderLoadOptions` of
`@prose-reader/react-native` takes `target` in place of `cfi` the same way.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YNJfUFaQbVhXaYd5pGyGfK

### Features

* **core:** open the reader at any navigation target ([370d3c2](https://github.com/mbret/prose-reader/commit/370d3c2a1cd5017f9b4fb38d70bf31ed44306e79))



## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)


### Bug Fixes

* **core:** open at the initial cfi without reporting the start of the book ([fd1ea00](https://github.com/mbret/prose-reader/commit/fd1ea00a6d7e8384d1f73a0090ec8c1f26ac1ef9))



## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-native





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-native





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-native





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-native





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **react-native:** `bridgeReader`'s `createReader` factory receives
`{ manifest, cfi }` instead of the manifest, and `load` from
`useCreateReader` takes `{ manifest, cfi? }` instead of the manifest.
* **react-native:** `pagination`, `context` and `readingPosition` in the bridge
state are `null`, not `undefined`, until the reader of the book last loaded
reports them. The web side reports through `report(load, state)` instead of
`setPagination` and `setContext`.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016xgXrGA781dXRQAH1vuHxd

### Features

* **react-native:** relay the reading position to native, and let load reopen at one ([#422](https://github.com/mbret/prose-reader/issues/422)) ([13fb0f9](https://github.com/mbret/prose-reader/commit/13fb0f90c63af9121cbcb2b7ce49fece9de6bd28)), closes [#415](https://github.com/mbret/prose-reader/issues/415)



## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-native





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-native





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)


### Bug Fixes

* **react-native:** release replaced readers and order expo archives, with real tests ([#394](https://github.com/mbret/prose-reader/issues/394)) ([fcff364](https://github.com/mbret/prose-reader/commit/fcff3641b9950e1d275623be7ea4288c48d29a4d))



## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** `EnhancerPaginationInto` is renamed `EnhancerPaginationInfo`.
`ChapterInfo` is now recursive: the toc has no depth limit, and the builder
already produced chains deeper than the four hand-unrolled levels the type
described, through casts.

### Documentation

* **pagination:** document the pagination surface that exists ([#391](https://github.com/mbret/prose-reader/issues/391)) ([46a0e14](https://github.com/mbret/prose-reader/commit/46a0e14adc646ab7e813d0a7550383bd8cd19e89)), closes [#390](https://github.com/mbret/prose-reader/issues/390)



## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **react-native:** @prose-reader/react-native requires Expo SDK 57; its
expo-file-system peer is ^57.0.0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PCcUZEBkJdYVWXpz1ZerQ7

* docs(react-native): install the package with npm install alone

npm and pnpm install a package's peers with it, so listing all ten of them
was noise, and it asked apps to add internals such as @prose-reader/shared by
hand. Installed from a packed tarball into a fresh SDK 57 app, a plain
`npm install @prose-reader/react-native` brings every peer and leaves `npm
ls` clean. expo-file-system is already there, since expo depends on it.

The one exception is react-native-webview: npm takes its latest release
(14.0.1) where SDK 57 ships 13.16.1, and `expo install --check` does not flag
it because the app does not list it. `npx expo install react-native-webview`
gets 13.16.1.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PCcUZEBkJdYVWXpz1ZerQ7

* docs(react-native): list every peer in the install command again

The package only uses peer dependencies, all of them required. Listing
them makes the app declare each one, the way the react-reader page
documents its own peers, and it works with Yarn, which does not install
peers for you. It also routes both native modules through `npx expo
install`. With the plain `npm install`, react-native-webview came in as
npm's latest release (14.0.1), undeclared, and `expo install --check`
never saw it.

The paragraph now says why the command is that long.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PCcUZEBkJdYVWXpz1ZerQ7

* build(demo): regenerate the native projects for expo sdk 57

The committed ios/ and android/ projects were SDK 53 prebuild output. The
iOS one pinned a 15.5 deployment target, while SDK 57's ExpoFileSystem pod
requires 16.4. `expo run:ios` only prebuilds when the folder is missing,
so `npm run ios` reused that project and failed at `pod install`.

Both are regenerated with `expo prebuild --clean` under SDK 57, from
app.json alone, since neither held anything custom:
- iOS targets 16.4, the SDK default, now that app.json no longer overrides
  it. The Podfile follows the SDK 57 template.
- The Kotlin sources move to the directory matching the
  com.mbret.prosereactnativedemo package. The Gradle wrapper and the
  debugOptimized variant come from the SDK 57 template.
- ios/Podfile.lock, resolved against Expo 53 and React Native 0.79, is
  deleted along with the workspace `pod install` generates. CocoaPods does
  not run on Linux, so the first `npm run ios` writes both again.

The README says to regenerate the projects after an app.json change or an
SDK upgrade, since `npm run ios` and `npm run android` build them as they
are.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PCcUZEBkJdYVWXpz1ZerQ7

### Features

* **react-native:** settle the library and its demo on expo sdk 57 ([#386](https://github.com/mbret/prose-reader/issues/386)) ([fa9448f](https://github.com/mbret/prose-reader/commit/fa9448f511a7b9cf855016e14884854ebf5108d9))



## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-native





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-native





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** anchor navigation on settled results and drop navigationId (#369)

### Code Refactoring

* **pagination:** anchor navigation on settled results and drop navigationId ([#369](https://github.com/mbret/prose-reader/issues/369)) ([1229ccb](https://github.com/mbret/prose-reader/commit/1229ccb85d7af554a22668275bbd205fe220b4ea))



## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-native





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.1](https://github.com/mbret/prose-reader/compare/v2.0.0...v2.0.1) (2026-09-22)


### Bug Fixes

* **build:** annotate the exported types declaration emit cannot infer, and reattach the apps to the workspace ([#371](https://github.com/mbret/prose-reader/issues/371)) ([6091f84](https://github.com/mbret/prose-reader/commit/6091f84d77e267cd07afef0d37257f24c20f0758))



## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-native





## [1.374.2](https://github.com/mbret/prose-reader/compare/v1.374.1...v1.374.2) (2026-09-21)

**Note:** Version bump only for package @prose-reader/react-native





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/react-native
