# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [42.0.0](https://github.com/mbret/prose-reader/compare/v41.0.0...v42.0.0) (2026-11-10)

### Features

* **react-reader:** accept reactjrx 5 as a peer ([8e910e7](https://github.com/mbret/prose-reader/commit/8e910e77d3d77c5691a8b9caae1fa7a73e132ff5))


## [41.0.0](https://github.com/mbret/prose-reader/compare/v40.0.0...v41.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/react-reader





## [40.0.0](https://github.com/mbret/prose-reader/compare/v39.0.0...v40.0.0) (2026-11-05)

### ⚠ BREAKING CHANGES

* **react-reader:** for a managed setting the app gives no value,
  react-reader writes defaultSettings, else the reader's default, over the
  value the reader was created with. Pass the values the reader should
  take as settings or defaultSettings. onSettingsChange reports a setting
  as undefined when the user sets it back to Default or Same as global:
  merging the changes leaves that scope without a value.
* **react-reader:** ReactReader no longer takes a reader. Render
  ReactReaderProvider with createReader, a memoized function that returns
  a new reader, and render ReactReader inside it. Move settings,
  settingsByScope, settingsScopes, onSettingsChange,
  onSettingsScopesChange, annotations, onAnnotationCreate,
  onAnnotationUpdate, onAnnotationDelete and zoomMaxScale to
  ReactReaderProvider. Stop mounting and destroying the reader in the
  app, stop giving the managed settings to createReader, remove the
  reader's container element from ReactReader's children, and get the
  reader from useReader().

### Features

* **react-reader:** add Default and Same as global, and defaultSettings ([d0477dd](https://github.com/mbret/prose-reader/commit/d0477dd433d3cbefacf72c6e63ae01e986891cec)), closes [#677](https://github.com/mbret/prose-reader/issues/677)
* **react-reader:** create the reader in ReactReaderProvider, and show it in ReactReader ([75fdb03](https://github.com/mbret/prose-reader/commit/75fdb03e507db5d3956264a1203c0b6d68efa7d2))
* **react-reader:** keep the reader while an Activity hides ReactReader ([17c2276](https://github.com/mbret/prose-reader/commit/17c227664f615a767b76399158dd09bbefd00bfe)), references [#684](https://github.com/mbret/prose-reader/issues/684)
* **react-reader:** offer Default or Same as global in the font size dialog ([87b5c5e](https://github.com/mbret/prose-reader/commit/87b5c5ecaa23cabdd01d9a0d8843e8f7a510ddd1))

### Bug Fixes

* **react-reader:** create the reader in a view rendered into a detached container ([93e222f](https://github.com/mbret/prose-reader/commit/93e222feea7b040ed2d30269f0d088ca04749465))
* **react-reader:** destroy the reader once React removes a ReactReader that an Activity hides ([9425639](https://github.com/mbret/prose-reader/commit/94256399a454e10f84ed4560a272e52bfc3004d1))
* **react-reader:** keep reporting reader changes after onSettingsChange throws ([f2f6f83](https://github.com/mbret/prose-reader/commit/f2f6f83b53c93692170db199cce99a6cbea10ed6))
* **react-reader:** keep the font size controls while the font size has no value ([be87579](https://github.com/mbret/prose-reader/commit/be87579b7a1253c4fa9733f9bf501ec7890572c2))
* **react-reader:** keep the view's menus and props in a context ReactReader owns ([af68159](https://github.com/mbret/prose-reader/commit/af681595d0697e79cb90fd1ac64a3022bb66ab1e))
* **react-reader:** let ReactReaderSettings hold the undefined it reports ([90b6ac4](https://github.com/mbret/prose-reader/commit/90b6ac4466d3bf38917270c3387ef0cf4d3b18df))
* **react-reader:** stop listening to a reader once it is replaced or unmounted ([86a43c0](https://github.com/mbret/prose-reader/commit/86a43c02eaa849577f5e87482986f08a53b65110))
* **react-reader:** stop listening to a reader once it is replaced or unmounted ([494fff6](https://github.com/mbret/prose-reader/commit/494fff6603d87cc182d3bd5f012998677b3eb5b2))
* **react-reader:** watch the root node of a hidden ReactReader's element ([1861601](https://github.com/mbret/prose-reader/commit/1861601eea0ea485165e4f594f6cd6dfe698ef84))


## [39.0.0](https://github.com/mbret/prose-reader/compare/v38.0.1...v39.0.0) (2026-11-04)

### ⚠ BREAKING CHANGES

* **react-reader:** react-reader needs reactjrx 4. An app on reactjrx 2
  or 3 upgrades it to 4.x. reactjrx 3 removed `useConcatMutation$`, and
  reactjrx 4 removed `Signal.setValue` and `Signal.subject`.

### Features

* **react-reader:** accept reactjrx 3 and 4, and move the apps to 4.0.4 ([744de54](https://github.com/mbret/prose-reader/commit/744de54f1e896ed7cd53ca1d5ec9c462c3e27dfc))
* **react-reader:** export useReader, typed by a Register declaration ([fe6a3b2](https://github.com/mbret/prose-reader/commit/fe6a3b298815955be66f1fee85feb67da30e4fd7))
* **react-reader:** require reactjrx 4 ([584330b](https://github.com/mbret/prose-reader/commit/584330b279276f5268400772058ca1119c974f00))

### Bug Fixes

* **react-reader:** hide the floating progress while react-reader's own quick menu is open ([13ed78c](https://github.com/mbret/prose-reader/commit/13ed78c3a0b5c8f3cb05e59123d8c6d10d9b3e25))
* **react-reader:** keep the quick menu uncontrolled when the app only listens to it ([a272851](https://github.com/mbret/prose-reader/commit/a272851cfcade94baf124af13bb9f52013a0a9bd))
* **react-reader:** throw when useReader runs outside ReactReader, and accept a declared reader that can be undefined ([4e37c68](https://github.com/mbret/prose-reader/commit/4e37c68185e95fc200c147f888ecebd1c980f3bb))
* **react-reader:** write every provider prop into the context, so a dropped prop goes back to undefined ([a1e0804](https://github.com/mbret/prose-reader/commit/a1e08040002afe338cd7f4df4a2896d076d22506))


## [38.0.1](https://github.com/mbret/prose-reader/compare/v38.0.0...v38.0.1) (2026-11-03)

**Note:** Version bump only for package @prose-reader/react-reader





## [38.0.0](https://github.com/mbret/prose-reader/compare/v37.0.0...v38.0.0) (2026-11-02)

### Features

* **react-reader:** add a theme menu ([f706b0a](https://github.com/mbret/prose-reader/commit/f706b0a1216c6877f9559832499bace4d12e2704))


## [37.0.0](https://github.com/mbret/prose-reader/compare/v36.0.0...v37.0.0) (2026-11-02)

### ⚠ BREAKING CHANGES

* **enhancer-gestures:** the gestures settings no longer have
  `fontScalePinchEnabled`, `fontScalePinchThrottleTime`,
  `fontScaleMinScale` and `fontScaleMaxScale`, and a pinch never changes
  `fontScale`. Remove those settings from the options and the
  `gestures.settings.update()` calls you pass. To resize text with a
  pinch, set `zoomMaxScale` to `1`, so that a pinch never zooms, and
  update `fontScale` from the pinch events of `reader.gestures.gestures$`.

### Features

* **react-reader:** manage the reader's theme like its other settings ([87bbd38](https://github.com/mbret/prose-reader/commit/87bbd38b6ab544ca90455c5f8aff09d9414612c8))
* **react-reader:** manage the theme with the other reader settings ([9e577ef](https://github.com/mbret/prose-reader/commit/9e577efd2f4f50e951b62d517668c85856674f1f))
* **react-reader:** write the theme into the reader without waiting ([1a607b1](https://github.com/mbret/prose-reader/commit/1a607b19ddc0985e854a8d333ea646144b4d8dd0))

### Bug Fixes

* **enhancer-gestures:** make a pinch only zoom ([c9d3f4b](https://github.com/mbret/prose-reader/commit/c9d3f4b6e9b7dc483ca48f632c0cf0f44189da7c)), closes [#654](https://github.com/mbret/prose-reader/issues/654)


## [36.0.0](https://github.com/mbret/prose-reader/compare/v35.0.1...v36.0.0) (2026-10-29)

### ⚠ BREAKING CHANGES

* **core:** give the spine a state, with its element and the first item awaiting layout

### Code Refactoring

* **core:** give the spine a state, with its element and the first item awaiting layout ([28efcd4](https://github.com/mbret/prose-reader/commit/28efcd41a9ed7dca52617cdb444b87667fea270a))


## [35.0.1](https://github.com/mbret/prose-reader/compare/v35.0.0...v35.0.1) (2026-10-28)

### Bug Fixes

* **react-reader:** do not report the values a reader starts with ([bc05daf](https://github.com/mbret/prose-reader/commit/bc05daff49eb49306fc25ad072caef8d2d2e97d8))


## [35.0.0](https://github.com/mbret/prose-reader/compare/v34.0.0...v35.0.0) (2026-10-28)

### ⚠ BREAKING CHANGES

* **react-reader:** the ReactReader props `fontSize`, `onFontSizeChange`,
  `fontSizeScope`, `onFontSizeScopeChange`, `fontSizeValues`, `spreadMode`,
  `onSpreadModeChange`, `spreadModeScope`, `onSpreadModeScopeChange` and
  `spreadModeValues` are replaced by `settings`, `onSettingsChange`,
  `settingsByScope`, `settingsScopes` and `onSettingsScopesChange`, keyed
  by `fontScale` and `spreadMode`. A change is reported as
  `onSettingsChange({ fontScale: 1.5 }, "book")` rather than
  `onFontSizeChange("book", 1.5)`. A setting whose scope has no value takes
  the global one.

### Features

* **react-reader:** export the types of the settings props ([7663968](https://github.com/mbret/prose-reader/commit/7663968adc74e481385c48e26522c5d67053526a))
* **react-reader:** take back in settingsScopes the scopes the app is given ([4579aa0](https://github.com/mbret/prose-reader/commit/4579aa0eab0a6a1203cacf50019e9c7de341d27e))
* **react-reader:** take the menu settings as one partial with one change callback ([6ef4598](https://github.com/mbret/prose-reader/commit/6ef459859603a45f11e4f8998cfb7deba8fe0be4))

### Bug Fixes

* **react-reader:** show in a scope's tab the value that scope applies ([98b29df](https://github.com/mbret/prose-reader/commit/98b29dffcdb68cd39329605e6257b31b37ebd1e4))
* **react-reader:** write a setting into the reader at once, the font scale once per drag ([1c0d2fa](https://github.com/mbret/prose-reader/commit/1c0d2fabf54d3adbe2e5b94ab2bc772e72b475f4))


## [34.0.0](https://github.com/mbret/prose-reader/compare/v33.0.0...v34.0.0) (2026-10-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [33.0.0](https://github.com/mbret/prose-reader/compare/v32.0.0...v33.0.0) (2026-10-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [32.0.0](https://github.com/mbret/prose-reader/compare/v31.0.0...v32.0.0) (2026-10-21)

### ⚠ BREAKING CHANGES

* **react-reader:** `@prose-reader/react-reader` takes `react` and
  `react-dom` 19.x as peer dependencies.
* `@prose-reader/react-reader` takes `reactjrx` 2.x as a
  peer dependency. Apps using it upgrade reactjrx to 2.x.

### Miscellaneous Chores

* move to reactjrx 2 ([c56bc9e](https://github.com/mbret/prose-reader/commit/c56bc9e2c405139f1a374cc25080317d98eddd13))
* **react-reader:** require React 19 ([20c3548](https://github.com/mbret/prose-reader/commit/20c3548ec93de85e177dae6ca8ca7720432c30bd))


## [31.0.0](https://github.com/mbret/prose-reader/compare/v30.3.0...v31.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/react-reader





## [30.2.0](https://github.com/mbret/prose-reader/compare/v30.1.2...v30.2.0) (2026-10-20)

**Note:** Version bump only for package @prose-reader/react-reader





## [30.1.2](https://github.com/mbret/prose-reader/compare/v30.1.1...v30.1.2) (2026-10-20)

**Note:** Version bump only for package @prose-reader/react-reader





## [30.1.1](https://github.com/mbret/prose-reader/compare/v30.1.0...v30.1.1) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [30.0.0](https://github.com/mbret/prose-reader/compare/v29.0.0...v30.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [29.0.0](https://github.com/mbret/prose-reader/compare/v28.2.0...v29.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [28.2.0](https://github.com/mbret/prose-reader/compare/v28.1.0...v28.2.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [28.1.0](https://github.com/mbret/prose-reader/compare/v28.0.0...v28.1.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [28.0.0](https://github.com/mbret/prose-reader/compare/v27.0.0...v28.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [27.0.0](https://github.com/mbret/prose-reader/compare/v26.0.0...v27.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [26.0.0](https://github.com/mbret/prose-reader/compare/v25.1.0...v26.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/react-reader





## [25.1.0](https://github.com/mbret/prose-reader/compare/v25.0.1...v25.1.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/react-reader





## [25.0.1](https://github.com/mbret/prose-reader/compare/v25.0.0...v25.0.1) (2026-10-10)

### Bug Fixes

* declare the MIT license in every published package ([fefd424](https://github.com/mbret/prose-reader/commit/fefd424c2bf8aba9e925ffb1022fa9ef3a08b15d))


## [25.0.0](https://github.com/mbret/prose-reader/compare/v24.0.0...v25.0.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/react-reader





## [24.0.0](https://github.com/mbret/prose-reader/compare/v23.0.0...v24.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [23.0.0](https://github.com/mbret/prose-reader/compare/v22.0.2...v23.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [22.0.2](https://github.com/mbret/prose-reader/compare/v22.0.1...v22.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [22.0.1](https://github.com/mbret/prose-reader/compare/v22.0.0...v22.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [22.0.0](https://github.com/mbret/prose-reader/compare/v21.0.2...v22.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [21.0.2](https://github.com/mbret/prose-reader/compare/v21.0.1...v21.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [21.0.1](https://github.com/mbret/prose-reader/compare/v21.0.0...v21.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/react-reader





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

### Features

* **react-reader:** manage the spread mode through props, as the font size ([80f3b02](https://github.com/mbret/prose-reader/commit/80f3b027133dfbb7999d323dc0a44f638f1c08dd))

### Bug Fixes

* **react-reader:** keep the app's setting value over the one the reader holds when met ([d747b4e](https://github.com/mbret/prose-reader/commit/d747b4e56c7bcb19e9ba68c4fa6dc84bf54d24ff))


## [20.0.1](https://github.com/mbret/prose-reader/compare/v20.0.0...v20.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [17.0.4](https://github.com/mbret/prose-reader/compare/v17.0.3...v17.0.4) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [16.0.1](https://github.com/mbret/prose-reader/compare/v16.0.0...v16.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/react-reader





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### ⚠ BREAKING CHANGES

* **core:** `shouldUseSpreadModeForViewport` is removed from
`@prose-reader/core`. Call `reader.viewport.wouldSpreadAt(size)` instead,
which reads the book and the `spreadMode` setting from the reader.
`Context.update` accepts only `rootElement` and `hasVerticalWriting`.

### Features

* **core:** ask the reader about spreads instead of free functions ([33d9b41](https://github.com/mbret/prose-reader/commit/33d9b41e4f28beb762d53da58fdeb296a97872f9))
* **react-reader:** add a layout dialog to the quick menu ([8a3ce75](https://github.com/mbret/prose-reader/commit/8a3ce7517846534fd8832713ca4e350ebd7d2664)), closes [#424](https://github.com/mbret/prose-reader/issues/424)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.3](https://github.com/mbret/prose-reader/compare/v13.0.2...v13.0.3) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/react-reader





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





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

**Note:** Version bump only for package @prose-reader/react-reader





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/react-reader





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-reader





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.1](https://github.com/mbret/prose-reader/compare/v2.0.0...v2.0.1) (2026-09-22)


### Bug Fixes

* **build:** annotate the exported types declaration emit cannot infer, and reattach the apps to the workspace ([#371](https://github.com/mbret/prose-reader/issues/371)) ([6091f84](https://github.com/mbret/prose-reader/commit/6091f84d77e267cd07afef0d37257f24c20f0758))



## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/react-reader





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/react-reader
