# @prose-reader/react-native

prose renders in a webview; your app is native. This package is the bridge
between the two, so the engine stays on the web side and the reading UX stays on
the native side (see [introduction.md](introduction.md "mention") for why).

It ships one entry per side of that boundary:

| entry                             | runs in                             | used with                                              |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| `@prose-reader/react-native/web`  | your web assets, inside the webview | `@prose-reader/core`                                   |
| `@prose-reader/react-native`      | your React Native app               | `react`, `expo-file-system`, `react-native-webview`    |

A runnable example of both sides is in the [demo](https://github.com/mbret/prose-reader/tree/master/prose-react-native-demo).

## Installation

```shell
npm install @prose-reader/react-native @prose-reader/core @prose-reader/streamer \
  @prose-reader/archive-reader @prose-reader/shared rxjs \
  @webview-bridge/react-native @webview-bridge/web
npx expo install expo-file-system react-native-webview
```

The package only uses peer dependencies, all of them required, so your app
declares each one and holds its single copy. `npx expo install` picks the
`expo-file-system` and `react-native-webview` versions your Expo SDK expects.
The package targets SDK 57: its `expo-file-system` peer is `^57.0.0`, and an
`expo-file-system` major is the SDK it ships with. `react` 19 is your app's
own.

## Web side

Two calls: create the bridge, then hand it a factory that builds the reader.

```typescript
import { createReader } from "@prose-reader/core"
import {
  bridgeReader,
  createReaderBridge,
} from "@prose-reader/react-native/web"
import { from, map } from "rxjs"

const bridge = createReaderBridge()

const controller = bridgeReader({
  bridge,
  containerElement: document.getElementById("reader"),
  /**
   * Invoked for every `load` event coming from the native side, with what it
   * sent: the manifest, and the cfi to open at. A reader renders a single
   * book: a subsequent `load` destroys the previous reader and creates a
   * fresh one.
   */
  createReader: (options) =>
    createReader({
      ...options,
      /**
       * Here resources are served by the native side. Streaming over http or
       * straight from a CDN works exactly as it does on the web — the
       * introduction covers the options.
       */
      getResource: (item) =>
        from(bridge.getResource(item)).pipe(
          map(
            (resource) =>
              new Response(resource.data, { headers: resource.headers }),
          ),
        ),
      // …any other reader option, same as on the web
    }),
})
```

From there the bridge relays navigation commands in, and pagination, context and
the reading position out, so the native side drives the reader without touching
prose directly.

`bridgeReader` returns a `ReaderBridgeController`, which is the escape hatch for
the cases the bridge does not cover — anything you want to do with the full
reader API from inside the webview:

```typescript
import type { ReaderBridgeController } from "@prose-reader/react-native/web"

const turnRightFromTheWebSide = (controller: ReaderBridgeController) => {
  controller.getReader()?.navigation.turnRight()
}
```

{% hint style="info" %}
`getReader()` returns `undefined` before the native side sends its first `load`,
again while a reader is being replaced, and after a `load` whose reader failed
to build: the previous reader is destroyed either way. Reach for it only when the bridge
has no equivalent; a method missing from the bridge is worth
[raising an issue](https://github.com/mbret/prose-reader/issues) over.
{% endhint %}

## Native side

`useCreateReader` builds the bridge and the `WebView` bound to it. It returns
`null` until that bridge is ready, then `{ ReaderWebView, load, appBridge,
webviewBridge }`. Pass the whole thing to `ReaderProvider` so the hooks below
can reach it. `load` sends the book to the webview: its `manifest`, and the
`cfi` to open it at, if any, the two reader options the factory above receives.

```tsx
import { ReaderProvider, useCreateReader } from "@prose-reader/react-native"

const Reader = ({ html }: { html: string }) => {
  const reader = useCreateReader({
    // Answers the web side's resource requests — the other half of the
    // `getResource` above.
    getResource: (resource) =>
      streamer.fetchResourceAsData({ key, resourcePath: resource.href }),
  })

  if (!reader) return null

  return (
    <ReaderProvider reader={reader}>
      <reader.ReaderWebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onLoadEnd={() => {
          // The webview is up: send it the book.
          reader.load({ manifest })
        }}
      />
      <BottomMenu />
    </ReaderProvider>
  )
}
```

Inside that provider, two hooks are all the reading UX needs:

```tsx
import { useReader, useReaderState } from "@prose-reader/react-native"

const BottomMenu = () => {
  const reader = useReader()
  const pagination = useReaderState((state) => state.pagination)

  return (
    <View>
      <Button title="<" onPress={() => reader.turnLeft()} />
      <Text>
        {pagination?.begin.absolutePageIndex} / {pagination?.numberOfTotalPages}
      </Text>
      <Button title=">" onPress={() => reader.turnRight()} />
    </View>
  )
}
```

* `useReader()` — commands sent to the reader in the webview: `turnLeft`,
  `turnRight`
* `useReaderState(selector)` — the state the web side pushes back, selected the
  same way as any bridge store: `pagination`, `context` and `readingPosition`
  of the book last loaded, each `null` until its reader reports it. `load`
  clears them: from the moment it is called they are `null` again, and nothing
  the previous book's reader reports afterwards lands

The bridge is maintained by hand and is not a 1:1 mapping of the prose API, so
it is expected to lag behind it — see
[introduction.md](introduction.md "mention").

## Saving the reading position

To reopen a book where the reader left it, save `readingPosition` and send it
back with the next `load`. Save it rather than pagination's `begin.cfi`, which
moves every time the book is laid out again, on a rotation for example: the
[reading position section of the navigation guide](../learn/navigation.md#reading-position)
explains why, and when the reading position changes.

```tsx
import { useEffect } from "react"
import {
  ReaderProvider,
  useCreateReader,
  useReaderState,
} from "@prose-reader/react-native"

const Reader = ({ bookId, html }: { bookId: string; html: string }) => {
  const reader = useCreateReader({ getResource })

  if (!reader) return null

  return (
    <ReaderProvider reader={reader}>
      <reader.ReaderWebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onLoadEnd={async () => {
          // `undefined` the first time: the book opens at its start.
          const cfi = await storage.getReadingPosition(bookId)

          reader.load({ manifest, cfi })
        }}
      />
      <SaveReadingPosition bookId={bookId} />
    </ReaderProvider>
  )
}

const SaveReadingPosition = ({ bookId }: { bookId: string }) => {
  const readingPosition = useReaderState((state) => state.readingPosition)

  useEffect(() => {
    if (readingPosition) storage.setReadingPosition(bookId, readingPosition)
  }, [bookId, readingPosition])

  return null
}
```

`storage` stands for wherever your app keeps data. The first position the
reader reports is the one it opens at, the `cfi` sent with `load` or the start
of the book, so every value can be saved as it comes. `load` clears the state
the moment it is called, and nothing the previous book's reader reports lands
after it: every `readingPosition` is one of the book last passed to `load`, so
save it under that book, as `SaveReadingPosition` does with the `bookId` the
`Reader` loaded.

## Serving the book

Turning a downloaded book into an `Archive` is covered by
[react-native.md](../learn/streamer/react-native.md "mention"). What this
package adds on top of it is `ReactNativeStreamer`: a
[streamer](../learn/streamer/README.md) whose `fetchResourceAsData` returns a
resource as `{ data, headers }` — a string body rather than a `Response`,
because a string is what survives the trip through a webview.

```typescript
import {
  createArchiveFromExpoFileSystemNext,
  ReactNativeStreamer,
} from "@prose-reader/react-native"
import { Directory } from "expo-file-system"

export const streamer = new ReactNativeStreamer({
  getArchive: async (bookFolderName) =>
    createArchiveFromExpoFileSystemNext(
      new Directory(unzippedDestination, bookFolderName),
      { orderByAlpha: true, name: "archive.zip" },
    ),
})
```

That streamer is what answers the `getResource` handed to `useCreateReader`
above.

{% hint style="warning" %}
Resources crossing the bridge are serialised as strings. This is fine for text
content, but a comic with hundreds of MB of images may hit a webview limit —
serve those over http instead.
{% endhint %}
