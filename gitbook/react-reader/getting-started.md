# Getting Started

## Installation

```bash
npm install @prose-reader/core @prose-reader/react-reader @chakra-ui/react @emotion/react rc-slider react-icons reactjrx
```

This package only uses peerDependencies so don't hesitate to use the library for the rest of your app.

[https://github.com/mbret/reactjrx](https://github.com/mbret/reactjrx) is specifically very useful if you use `rxjs`.

```typescript
import { ReactReader } from "@prose-reader/react-reader"
// Don't forget to import the package css
import "@prose-reader/react-reader/index.css"

const MyAppReader = () => {
  // You own the creation of your reader instance
  const readerInstance = useReaderInstance()
  
  // Then we handle the rendering
  return (
    <ReactReader
      reader={readerInstance}
    />
  )
}
```

## Prose settings vs Reader settings

Some settings are managed by the reader (eg: font size), as a result you should not specify them during the creation of your prose instance or they will be overwritten. Check the properties from the reader component to see what is available. Usually when the reader can change a setting of prose or its enhancers its setting should be managed through it. This is to avoid having multiple source of truth.

## Toggling features

By default, the reader will use the bare core reader. If you want to unlock more features you can enhance your reader with automatically supported enhancers.

For example adding the enhancer [#search](getting-started.md#search "mention") will unlock this menu:

<figure><img src="../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

```typescript
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { createReader } from "@prose-reader/core"

export const createAppReader = searchEnhancer(createReader)
```

{% hint style="warning" %}
We are detecting certain markers in the enhancers to verify whether they exist and are valid. This is assuming you don't fiddle with them. The general rule of enhancers is to allow augmentation but not alteration.
{% endhint %}

### Search

See [search.md](../enhancers/search.md "mention") to install enhancer

### Bookmarks

See [annotations.md](../enhancers/annotations.md "mention") to install enhancer

* Bookmarking a page is done by tapping the top right corner of the page.

### Annotations

See [annotations.md](../enhancers/annotations.md "mention") to install enhancer

### Audio / Audiobooks

See [audio.md](../enhancers/audio.md "mention") to install enhancer

### Gallery

<div align="center"><figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL2hhcnVrby1jb21pYy56aXA=(iPad Pro).png" alt="" width="188"><figcaption></figcaption></figure> <figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL2hhcnVrby1jb21pYy56aXA=(iPhone SE) (2).png" alt="" width="188"><figcaption></figcaption></figure></div>

See [gallery.md](../enhancers/gallery.md "mention")to install enhancer

### Refit

See [refit.md](../enhancers/refit.md "mention")to install enhancer

