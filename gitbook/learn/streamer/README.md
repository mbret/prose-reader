---
description: Stream your content with javascript
---

# Streamer

This package is a ready to use javascript streamer. It is by design environment agnostic in order to be compatible with the browser, node or React Native (to only cite a few).

The streamer consumes archives — it generates manifests and serves resources from them. Reading and parsing the archives themselves (the `Archive` type and the `createArchiveFrom*` creators) is owned by [`@prose-reader/archive-reader`](archives.md).

