# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)


### Bug Fixes

* **cfi:** read a text assertion spanning lines ([0823177](https://github.com/mbret/prose-reader/commit/08231777bb2db2b36c80895d1b40da86118a87d4))



## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **cfi:** parse throws for strings it used to read in part, such as
a cfi with text after its closing parenthesis or without one, or with a
step or an offset missing its number.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015NcxSCfPM1xnxgFqpDBeRu
* **navigation:** a navigation to a spine item the book does not have is
ignored rather than clamped to its first or last item, and a navigation
to an empty cfi is ignored rather than going to the first item.

### Bug Fixes

* **cfi:** throw for a string that is only partly a cfi ([a071e27](https://github.com/mbret/prose-reader/commit/a071e27d351cd807139fd9bfa9a0644a95c6dfef))
* **navigation:** ignore a navigation whose target names nothing in the book ([5203b99](https://github.com/mbret/prose-reader/commit/5203b99cab0cf2564a369e3dfa5c121d50534317)), closes [#465](https://github.com/mbret/prose-reader/issues/465)



## [16.0.1](https://github.com/mbret/prose-reader/compare/v16.0.0...v16.0.1) (2026-09-26)


### Bug Fixes

* **enhancer-audio:** select the track a book opens on ([5dba3ae](https://github.com/mbret/prose-reader/commit/5dba3aec588a512925d02533694c0623131538fb))



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
* **enhancer-audio:** fail a refused play instead of waiting for canplay ([96f2dc0](https://github.com/mbret/prose-reader/commit/96f2dc07e5584bed4f6676b1dfe8d76f87ceef88))
* **metadata-fetcher-api:** serve the playground from a checkout under a dot-directory ([d55e3e8](https://github.com/mbret/prose-reader/commit/d55e3e878b0a4982b0765fa2c2ca4197ce03e91c))
* **navigation:** take a target's progression from the page holding it ([e3b5681](https://github.com/mbret/prose-reader/commit/e3b5681e09b4d5e70b5e90a1b753818fbb4a01c7))



## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/root





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
* **enhancer-pdf,enhancer-audio:** constrain options only to what they read ([8b7bcc0](https://github.com/mbret/prose-reader/commit/8b7bcc085eb5000060d0cc3f46afa77a76de37b1))



## [14.1.0](https://github.com/mbret/prose-reader/compare/v14.0.0...v14.1.0) (2026-09-25)


### Features

* **enhancer-koreader:** navigate to xpointers, and report the reading position as one ([aea1d36](https://github.com/mbret/prose-reader/commit/aea1d3680f6159eaa737d14b411509e2dbe9718c))


### Bug Fixes

* **enhancer-koreader:** follow the target option, and pin the reopen report ([dd67cd6](https://github.com/mbret/prose-reader/commit/dd67cd654029fe894b05cbdcec8c26b7a8193133))
* **enhancer-koreader:** require the rxjs it is written against ([2458bc0](https://github.com/mbret/prose-reader/commit/2458bc0cc8e52e733d3d15cff8b1f968dce901d4))



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

**Note:** Version bump only for package @prose-reader/root





## [13.0.3](https://github.com/mbret/prose-reader/compare/v13.0.2...v13.0.3) (2026-09-25)


### Bug Fixes

* **demo:** declare haruko-comic.zip right to left ([1f6b4e2](https://github.com/mbret/prose-reader/commit/1f6b4e2f66a340ed59377abf9c8054c78346b758))
* **demo:** declare sample.cbz left to right ([c24b6f7](https://github.com/mbret/prose-reader/commit/c24b6f7543395af8a9bc2270400b9c5c2b80bc84)), closes [#449](https://github.com/mbret/prose-reader/issues/449)
* **demo:** label sous-le-vent as French and the webtoons as reflowable ([bff329e](https://github.com/mbret/prose-reader/commit/bff329e3e0504bd912a9ca744b4c4461e6fd29f2))



## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)


### Bug Fixes

* **gestures:** make the drag listener the only thing stopping the browser's own drag ([a9e23d7](https://github.com/mbret/prose-reader/commit/a9e23d756c671bee2ea7fa08c2f296bb47485928))
* **gestures:** stop the browser's own drag inside the book, so a moving press still pans or taps ([80fb239](https://github.com/mbret/prose-reader/commit/80fb239da1dd577a47c462018ad97447824bd390))



## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/root





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)


### ⚠ BREAKING CHANGES

* **navigation:** the core `NavigationTarget` no longer has `url`; the reader
`createReader` returns still takes it, through the url enhancer. `node` is a
new target type. After `goToUrl` to an element, the reading position is that
element's cfi rather than the first character of its page. A url outside the
book is ignored instead of going to the first item.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YNJfUFaQbVhXaYd5pGyGfK

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

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YNJfUFaQbVhXaYd5pGyGfK

* refactor(navigation): drop comments that restate the pipeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YNJfUFaQbVhXaYd5pGyGfK

* test(navigation): pin the reading position of a chapter opened at its root cfi

While the chapter loads it is the chapter start as the reader names it, not
the cfi as given; once loaded it is the first page, not the chapter.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YNJfUFaQbVhXaYd5pGyGfK

### Bug Fixes

* **core:** keep a forwarded pointer event's button, pointer and modifier keys ([aed8733](https://github.com/mbret/prose-reader/commit/aed873386471eef52a57d4a80ee90a9c9de035e5)), closes [#240](https://github.com/mbret/prose-reader/issues/240) [#240](https://github.com/mbret/prose-reader/issues/240)
* **gestures:** require gesturx 1.11.1, where only the primary button starts a gesture ([#439](https://github.com/mbret/prose-reader/issues/439)) ([a162710](https://github.com/mbret/prose-reader/commit/a162710837ae9d6882489d1d65852605319cc8c3))


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


Claude-Session: https://claude.ai/code/session_01DBqLS9PKYZf3fPBLPYkezW

Co-authored-by: Claude <noreply@anthropic.com>

### Features

* **metadata-fetcher-api:** cap concurrent lookups, leave rate limiting to the deployment ([#425](https://github.com/mbret/prose-reader/issues/425)) ([a0d78ea](https://github.com/mbret/prose-reader/commit/a0d78ea7200ee66cf08b65e1d2f5e9ae412ea255))


### Bug Fixes

* **layout:** decide spread mode in the viewport's layout, so a resize that switches it lays out once ([#398](https://github.com/mbret/prose-reader/issues/398)) ([260c332](https://github.com/mbret/prose-reader/commit/260c33205f9ef066515b8044856bd88bf325bcff))



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

**Note:** Version bump only for package @prose-reader/root





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

**Note:** Version bump only for package @prose-reader/root





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

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrAJRJ7bRywuXZwwLMJupc

* test(navigation): annotate state fixtures instead of asserting them

The fixtures were narrowed with `as const`. An annotation against the
helper's parameter type is as short, checks each fixture where it is
declared, and leaves no assertion for the repository's `as` policy to ask
about.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrAJRJ7bRywuXZwwLMJupc

### Bug Fixes

* **react-native:** release replaced readers and order expo archives, with real tests ([#394](https://github.com/mbret/prose-reader/issues/394)) ([fcff364](https://github.com/mbret/prose-reader/commit/fcff3641b9950e1d275623be7ea4288c48d29a4d))


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



## [4.0.2](https://github.com/mbret/prose-reader/compare/v4.0.1...v4.0.2) (2026-09-23)

**Note:** Version bump only for package @prose-reader/root





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/root





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** `PagesState` gains `layoutRequest`, which reaches
`reader.layout$` values, and `SpineLayout.layout$` emits the number of
the request it laid out for.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

* refactor(spine): derive layout currency from cancellation instead of numbering requests

Request numbers were there to tell a replaced layout from the current
one, because a request did not cancel what was already running: the
spine layout debounced before its switch, so a pass for an older
request could still finish, and the pages it produced were computed in
a stream that only switched on completed passes.

The wait now sits inside the switch, so a request cancels the pass
still running for an older one, and pages still being computed are
abandoned when a layout is requested. The next pages published after a
request are then the ones it asked for, and `isLayoutCurrent$` follows
from the streams: false from a request, true when pages are next
published. The numbering, the pages' `layoutRequest` field and the
public type change go.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

* fix(spine): count a reader layout as requested before the viewport is measured

`reader.layout()` measures the viewport before it lays the spine out,
and the viewport notifies synchronously, so anything reacting to it
could navigate while the pages still counted as current, and settle on
the layout being replaced. `master` avoided this because the
controller heard `reader.layout()` first; dropping that input for the
spine's own request stream lost it (found in review).

The reader now passes its layout requests to the spine, filtered to
after mount, which is the guard its own pipeline already applied, and
the spine counts them from the moment they are made. Viewport layouts
alone still do not count: zoom re-measures the viewport with the spine
geometry intact, and no spine layout would follow to make the pages
current again.

Tests: a navigation made while a requested layout measures the viewport
does not settle; a viewport-only layout keeps settlement; the enriched
result withdraws while the spine relays out for another item, which
fails on `master` as well.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QxXodieMWcddW8qxxf1R22

### Bug Fixes

* **pagination:** keep settlement only while the layout is current and the page is ready ([#379](https://github.com/mbret/prose-reader/issues/379)) ([d4059dd](https://github.com/mbret/prose-reader/commit/d4059dd1ffe69315481fca7a23deec87bb4d3c17)), closes [#369](https://github.com/mbret/prose-reader/issues/369)



## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)


### ⚠ BREAKING CHANGES

* **pagination:** anchor navigation on settled results and drop navigationId (#369)

### Code Refactoring

* **pagination:** anchor navigation on settled results and drop navigationId ([#369](https://github.com/mbret/prose-reader/issues/369)) ([1229ccb](https://github.com/mbret/prose-reader/commit/1229ccb85d7af554a22668275bbd205fe220b4ea))



## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)


### Bug Fixes

* **demo:** make the react native demo bundle again ([#375](https://github.com/mbret/prose-reader/issues/375)) ([6fa2cad](https://github.com/mbret/prose-reader/commit/6fa2cad2826e6529dc5bdf484269b44f5f37e85c))



## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.1](https://github.com/mbret/prose-reader/compare/v2.0.0...v2.0.1) (2026-09-22)


### Bug Fixes

* **build:** annotate the exported types declaration emit cannot infer, and reattach the apps to the workspace ([#371](https://github.com/mbret/prose-reader/issues/371)) ([6091f84](https://github.com/mbret/prose-reader/commit/6091f84d77e267cd07afef0d37257f24c20f0758))



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
* **release:** only from a `BREAKING CHANGE:` footer and ignores the
`!` subject marker entirely. So `feat!:` resolved to a patch.

### Features

* **deps:** upgrade xmldoc to 3.x ([#370](https://github.com/mbret/prose-reader/issues/370)) ([1d06cbe](https://github.com/mbret/prose-reader/commit/1d06cbe375e1a16f087e9a00d96a9767adec3e8d))


### Bug Fixes

* **release:** recognise the `!` breaking marker ([#368](https://github.com/mbret/prose-reader/issues/368)) ([bc95a4a](https://github.com/mbret/prose-reader/commit/bc95a4a6bcef8bd23df1a5c98bda4508d0bca961)), closes [#342](https://github.com/mbret/prose-reader/issues/342) [#356](https://github.com/mbret/prose-reader/issues/356)



## [1.374.2](https://github.com/mbret/prose-reader/compare/v1.374.1...v1.374.2) (2026-09-21)

**Note:** Version bump only for package @prose-reader/root





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/root
