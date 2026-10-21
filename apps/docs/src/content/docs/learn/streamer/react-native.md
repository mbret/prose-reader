---
title: "Streamer in React Native"
description: "Feed @prose-reader/streamer in a React Native app: build an archive from a book directory with expo-file-system, then generate the manifest prose reads."
sidebar:
  label: "React Native"
---

The streamer is source-agnostic — in React Native you're free to source content however you like (the file system, an in-memory buffer, the network, a custom unpacker…). The only requirement is to turn your source into an `Archive` (see [Archive Reader](/archive-reader) for the full list of creators and how to build your own).

As one example, streaming from a directory on disk via `expo-file-system`:

```typescript
import { createArchiveFromExpoFileSystemNext } from "@prose-reader/react-native"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import { Directory, Paths } from "expo-file-system"

const directory = new Directory(Paths.document, "book")
const archive = await createArchiveFromExpoFileSystemNext(directory, {
  name: "book.epub",
  orderByAlpha: true,
})

const manifest = await generateManifestFromArchive(archive)
```
