# @prose-reader/react-native

prose renders in a webview; your app is native. This package is the bridge
between the two, so the engine stays on the web side and the reading UX stays on
the native side (see [introduction.md](introduction.md "mention") for why).

It ships one entry per side of that boundary:

| entry                             | runs in                             | used with                        |
| --------------------------------- | ----------------------------------- | -------------------------------- |
| `@prose-reader/react-native/web`  | your web assets, inside the webview | `@prose-reader/core`             |
| `@prose-reader/react-native`      | your React Native app               | `react`, `expo-file-system`      |

A runnable example of both sides is in the [demo](https://github.com/mbret/prose-reader/tree/master/prose-react-native-demo).

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
   * Invoked for every `load` event coming from the native side. A reader
   * renders a single book: a subsequent `load` destroys the previous reader
   * and creates a fresh one from the new manifest.
   */
  createReader: (manifest) =>
    createReader({
      manifest,
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

From there the bridge relays navigation commands in and pagination and context
state out, so the native side drives the reader without touching prose directly.

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
and again while a reader is being replaced. Reach for it only when the bridge
has no equivalent; a method missing from the bridge is worth
[raising an issue](https://github.com/mbret/prose-reader/issues) over.
{% endhint %}

## Native side

`useCreateReader` builds the bridge and the `WebView` bound to it. It returns
`null` until that bridge is ready, then `{ ReaderWebView, load, appBridge,
webviewBridge }`. Pass the whole thing to `ReaderProvider` so the hooks below
can reach it.

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
          reader.load(manifest)
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
  same way as any bridge store: `pagination` and `context`, each `undefined`
  until the reader reports for the first time

The bridge is maintained by hand and is not a 1:1 mapping of the prose API, so
it is expected to lag behind it — see
[introduction.md](introduction.md "mention").

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
