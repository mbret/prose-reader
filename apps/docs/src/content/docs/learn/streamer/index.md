---
title: "Streamer"
description: "@prose-reader/streamer turns a book archive into the manifest a reader opens and serves the resources it requests, in the browser, on Node or in React Native."
---

This package is a ready to use javascript streamer. It is by design environment agnostic in order to be compatible with the browser, node or React Native (to only cite a few).

The streamer consumes archives — it generates manifests and serves resources from them. Reading, parsing and resolving the archives themselves (the `Archive` type, the `createArchiveFrom*` creators, `resolveArchive`) is owned by [`@prose-reader/archive-reader`](/archive-reader).

