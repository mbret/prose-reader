# Gallery

This enhancer gives you methods to facilitate creation of gallery of pages. This can be helpful to provide a quick overview and / or navigation for a book.

<figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL2hhcnVrby1jb21pYy56aXA=(iPhone SE).png" alt="" width="375"><figcaption><p>Gallery on the demo reader</p></figcaption></figure>

The gallery enhancer does not create a gallery for you, it will help you gather snapshots of pages that you can then display in your own gallery. This way it's agnostic and you are responsible for your entire design.

## Getting Started

```bash
npm install @prose-reader/enhancer-gallery
```

Connect the enhancer to your reader:

```typescript
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"

const createAppReader = galleryEnhancer(createReader)

/**
 * There is no required configuration for this
 * enhancer.
 */
const reader = createAppReader({})
```

## API

The API is under the `gallery` namespace.

```typescript
type Options = {}
```

### `.snapshot()`

```typescript
function snapshot(
  spineItem: SpineItem,
  parentElement: Element,
  options: {
    height: number
    width: number
  },
): Observable<HTMLElement>
```

This method takes a spine item and a given dimension for snapshot and will provide you with a copy of the relevant document (first page) scaled to your dimensions and centered. This will be an exact copy of how the page would look like in your current reader. It will however try to clean it up and only keep the rendered document. This means that things like annotations, customization to spine item will not be taken into account.

The parent element needs to be passed down as well as we will attach the snapshot to it automatically. This is needed for internal iframe loading events check.

{% hint style="info" %}
You may be wondering why we don't use a tool like [https://html2canvas.hertzen.com/](https://html2canvas.hertzen.com/) to create a snapshot. Drawing the iframe in a canvas would be much more memory efficient and easier to manipulate but it only works with same origin content. This is too big of a restriction to be used as default method.
{% endhint %}

