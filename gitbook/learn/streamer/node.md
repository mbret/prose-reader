# Node

The streamer is source-agnostic — in node you can feed it from a zip library, an extraction tool, raw buffers, URLs, or your own custom source. Pick whatever fits your stack; the only requirement is to turn your source into an `Archive` (see [Archives](archives.md) for the full list of creators and how to build your own).

As one example, opening a zip-based container (EPUB, CBZ) with `unzipper`:

```typescript
import {
  generateManifestFromArchive,
  generateResourceFromArchive,
} from "@prose-reader/streamer"
import { createArchiveFromUnzipper } from "@prose-reader/streamer/archives/createArchiveFromUnzipper"
import unzipper from "unzipper"

const directory = await unzipper.Open.file("book.epub")
const archive = await createArchiveFromUnzipper(directory, { name: "book.epub" })

const manifest = await generateManifestFromArchive(archive)
const resource = await generateResourceFromArchive(archive, "OEBPS/chapter1.xhtml")
```

{% hint style="info" %}
Each library-backed creator (`unzipper`, `libarchive.js`, `jszip`, `node-unrar-js`) is an optional peer dependency exposed as a subpath import, so you only install and bundle the one you actually use.
{% endhint %}
