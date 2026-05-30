# React Native

The streamer is source-agnostic — in React Native you're free to source content however you like (the file system, an in-memory buffer, the network, a custom unpacker…). The only requirement is to turn your source into an `Archive` (see [Archives](archives.md) for the full list of creators and how to build your own).

As one example, streaming from a directory on disk via `expo-file-system`:

```typescript
import { createArchiveFromExpoFileSystemNext } from "@prose-reader/react-native"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import { Directory, Paths } from "expo-file-system/next"

const directory = new Directory(Paths.document, "book")
const archive = await createArchiveFromExpoFileSystemNext(directory, {
  name: "book.epub",
  orderByAlpha: true,
})

const manifest = await generateManifestFromArchive(archive)
```
