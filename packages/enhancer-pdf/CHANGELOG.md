# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [43.0.0](https://github.com/mbret/prose-reader/compare/v42.0.0...v43.0.0) (2026-11-11)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [42.0.0](https://github.com/mbret/prose-reader/compare/v41.0.0...v42.0.0) (2026-11-10)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [41.0.0](https://github.com/mbret/prose-reader/compare/v40.0.0...v41.0.0) (2026-11-10)

### ⚠ BREAKING CHANGES

* **enhancer-pdf:** getArchiveForItem takes a spine item and returns
  Observable<Archive>; the enhancer asks it only for spine items whose
  container path ends in .pdf, and the archive must stay open while the
  subscription lives. The enhancer no longer wraps getResource.

### Bug Fixes

* **enhancer-pdf:** hold the pdf archive while the reader renders it ([af16fc5](https://github.com/mbret/prose-reader/commit/af16fc5164de93a1e90e7bda40c3e0f8ab0f6a03))
* **enhancer-pdf:** take no hold on a pdf archive once the reader is destroyed ([1678a6a](https://github.com/mbret/prose-reader/commit/1678a6ad5e773bc6f8f06fb13f2fb3456209593c))


## [40.0.0](https://github.com/mbret/prose-reader/compare/v39.0.0...v40.0.0) (2026-11-05)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [39.0.0](https://github.com/mbret/prose-reader/compare/v38.0.1...v39.0.0) (2026-11-04)

### Bug Fixes

* **enhancer-pdf:** hand the frame to waitForFrameReady once the text layer is rendered ([330ea19](https://github.com/mbret/prose-reader/commit/330ea19922046a207e88d3aec802df0bd74f7810))


## [38.0.1](https://github.com/mbret/prose-reader/compare/v38.0.0...v38.0.1) (2026-11-03)

### Bug Fixes

* **enhancer-pdf:** leave the items it does not serve to the reader's getResource ([7bf2ef3](https://github.com/mbret/prose-reader/commit/7bf2ef3578df6a7f18b37feb7d16ab308dd9d1f8))
* **enhancer-pdf:** serve an item by the last answer of getArchiveForItem ([c45db7f](https://github.com/mbret/prose-reader/commit/c45db7fb6d71d055564280762be3ec58a114a7b8))


## [38.0.0](https://github.com/mbret/prose-reader/compare/v37.0.0...v38.0.0) (2026-11-02)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [37.0.0](https://github.com/mbret/prose-reader/compare/v36.0.0...v37.0.0) (2026-11-02)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [36.0.0](https://github.com/mbret/prose-reader/compare/v35.0.1...v36.0.0) (2026-10-29)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [35.0.0](https://github.com/mbret/prose-reader/compare/v34.0.0...v35.0.0) (2026-10-28)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [34.0.0](https://github.com/mbret/prose-reader/compare/v33.0.0...v34.0.0) (2026-10-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [33.0.0](https://github.com/mbret/prose-reader/compare/v32.0.0...v33.0.0) (2026-10-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [32.0.0](https://github.com/mbret/prose-reader/compare/v31.0.0...v32.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [31.0.0](https://github.com/mbret/prose-reader/compare/v30.3.0...v31.0.0) (2026-10-21)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [30.2.0](https://github.com/mbret/prose-reader/compare/v30.1.2...v30.2.0) (2026-10-20)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [30.1.1](https://github.com/mbret/prose-reader/compare/v30.1.0...v30.1.1) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [30.0.0](https://github.com/mbret/prose-reader/compare/v29.0.0...v30.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [29.0.0](https://github.com/mbret/prose-reader/compare/v28.2.0...v29.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [28.1.0](https://github.com/mbret/prose-reader/compare/v28.0.0...v28.1.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [28.0.0](https://github.com/mbret/prose-reader/compare/v27.0.0...v28.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [27.0.0](https://github.com/mbret/prose-reader/compare/v26.0.0...v27.0.0) (2026-10-19)

### Bug Fixes

* **enhancer-pdf:** render the page each spine item names, past the tenth ([8008a98](https://github.com/mbret/prose-reader/commit/8008a98db02fb5bb114b3193ae24249a260f82af))


## [26.0.0](https://github.com/mbret/prose-reader/compare/v25.1.0...v26.0.0) (2026-10-19)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [25.1.0](https://github.com/mbret/prose-reader/compare/v25.0.1...v25.1.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [25.0.1](https://github.com/mbret/prose-reader/compare/v25.0.0...v25.0.1) (2026-10-10)

### Bug Fixes

* declare the MIT license in every published package ([fefd424](https://github.com/mbret/prose-reader/commit/fefd424c2bf8aba9e925ffb1022fa9ef3a08b15d))


## [25.0.0](https://github.com/mbret/prose-reader/compare/v24.0.0...v25.0.0) (2026-10-10)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [24.0.0](https://github.com/mbret/prose-reader/compare/v23.0.0...v24.0.0) (2026-09-27)

### ⚠ BREAKING CHANGES

* **core:** `DocumentRenderer` no longer has `setDocumentContainer()`
  or `detach()`. A custom renderer returns its document's element from
  `onCreateDocument()`, which becomes `documentContainer`, and no longer
  detaches it in `onUnload()`: `DocumentRenderer` removes it from the dom
  once `onUnload()` has run.

### Bug Fixes

* **core:** let the renderer's lifecycle own its document container ([45f80eb](https://github.com/mbret/prose-reader/commit/45f80ebb33e76a08966344f82f6b8d452aadde6b))


## [23.0.0](https://github.com/mbret/prose-reader/compare/v22.0.2...v23.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [22.0.2](https://github.com/mbret/prose-reader/compare/v22.0.1...v22.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [22.0.1](https://github.com/mbret/prose-reader/compare/v22.0.0...v22.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [22.0.0](https://github.com/mbret/prose-reader/compare/v21.0.2...v22.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [21.0.2](https://github.com/mbret/prose-reader/compare/v21.0.1...v21.0.2) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [21.0.1](https://github.com/mbret/prose-reader/compare/v21.0.0...v21.0.1) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [21.0.0](https://github.com/mbret/prose-reader/compare/v20.0.1...v21.0.0) (2026-09-27)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [20.0.1](https://github.com/mbret/prose-reader/compare/v20.0.0...v20.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [20.0.0](https://github.com/mbret/prose-reader/compare/v19.0.0...v20.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [19.0.0](https://github.com/mbret/prose-reader/compare/v18.0.0...v19.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [18.0.0](https://github.com/mbret/prose-reader/compare/v17.0.4...v18.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [17.0.3](https://github.com/mbret/prose-reader/compare/v17.0.2...v17.0.3) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [17.0.2](https://github.com/mbret/prose-reader/compare/v17.0.1...v17.0.2) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [17.0.1](https://github.com/mbret/prose-reader/compare/v17.0.0...v17.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [17.0.0](https://github.com/mbret/prose-reader/compare/v16.0.1...v17.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [16.0.0](https://github.com/mbret/prose-reader/compare/v15.0.1...v16.0.0) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [15.0.1](https://github.com/mbret/prose-reader/compare/v15.0.0...v15.0.1) (2026-09-26)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [15.0.0](https://github.com/mbret/prose-reader/compare/v14.1.0...v15.0.0) (2026-09-26)


### Bug Fixes

* **deps:** declare the rxjs versions each package needs ([1b31ae0](https://github.com/mbret/prose-reader/commit/1b31ae0031a7d1eb6b2d914dbbc70ebd8c88b9d1))
* **deps:** raise the rxjs floor to 7.5.5, the first to export its types ([eecd5af](https://github.com/mbret/prose-reader/commit/eecd5af26db5fb1c999b7f1012c11ae286206288))
* **enhancer-pdf,enhancer-audio:** constrain options only to what they read ([8b7bcc0](https://github.com/mbret/prose-reader/commit/8b7bcc085eb5000060d0cc3f46afa77a76de37b1))



## [14.0.0](https://github.com/mbret/prose-reader/compare/v13.0.5...v14.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [13.0.5](https://github.com/mbret/prose-reader/compare/v13.0.4...v13.0.5) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [13.0.4](https://github.com/mbret/prose-reader/compare/v13.0.3...v13.0.4) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [13.0.2](https://github.com/mbret/prose-reader/compare/v13.0.1...v13.0.2) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [13.0.1](https://github.com/mbret/prose-reader/compare/v13.0.0...v13.0.1) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [13.0.0](https://github.com/mbret/prose-reader/compare/v12.0.0...v13.0.0) (2026-09-25)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [12.0.0](https://github.com/mbret/prose-reader/compare/v11.0.0...v12.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [11.0.0](https://github.com/mbret/prose-reader/compare/v10.0.0...v11.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [10.0.0](https://github.com/mbret/prose-reader/compare/v9.0.0...v10.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [9.0.0](https://github.com/mbret/prose-reader/compare/v8.0.1...v9.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [8.0.1](https://github.com/mbret/prose-reader/compare/v8.0.0...v8.0.1) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [8.0.0](https://github.com/mbret/prose-reader/compare/v7.0.4...v8.0.0) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [7.0.4](https://github.com/mbret/prose-reader/compare/v7.0.3...v7.0.4) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [7.0.3](https://github.com/mbret/prose-reader/compare/v7.0.2...v7.0.3) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [7.0.2](https://github.com/mbret/prose-reader/compare/v7.0.1...v7.0.2) (2026-09-24)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [7.0.1](https://github.com/mbret/prose-reader/compare/v7.0.0...v7.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [7.0.0](https://github.com/mbret/prose-reader/compare/v6.0.0...v7.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [6.0.0](https://github.com/mbret/prose-reader/compare/v5.0.0...v6.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [5.0.0](https://github.com/mbret/prose-reader/compare/v4.0.2...v5.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [4.0.1](https://github.com/mbret/prose-reader/compare/v4.0.0...v4.0.1) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [4.0.0](https://github.com/mbret/prose-reader/compare/v3.0.0...v4.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [3.0.0](https://github.com/mbret/prose-reader/compare/v2.0.3...v3.0.0) (2026-09-23)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [2.0.3](https://github.com/mbret/prose-reader/compare/v2.0.2...v2.0.3) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [2.0.2](https://github.com/mbret/prose-reader/compare/v2.0.1...v2.0.2) (2026-09-22)


### Bug Fixes

* **release:** give lerna the edges its graph is missing ([#372](https://github.com/mbret/prose-reader/issues/372)) ([d8323ff](https://github.com/mbret/prose-reader/commit/d8323ffebbdd710c88bb2950b7a9358da3a34d64))



## [2.0.0](https://github.com/mbret/prose-reader/compare/v1.374.2...v2.0.0) (2026-09-22)

**Note:** Version bump only for package @prose-reader/enhancer-pdf





## [1.374.1](https://github.com/mbret/prose-reader/compare/v1.374.0...v1.374.1) (2026-09-21)

**Note:** Version bump only for package @prose-reader/enhancer-pdf
