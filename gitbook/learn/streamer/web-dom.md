# Web (dom)

{% hint style="danger" %}
This section is old and obsolete. A rewriting will be done in the future. You can still take a look as some of the concepts are still valid.
{% endhint %}

Although not the most recommended usage, you can stream your content directly through your JS app. This can be helpful for kickstart or proof of concept projects. Ideally you may want to move the streamer to a service worker or a server to optimize your streaming process further and have more control.

Here is a basic example that demonstrates how to stream an epub:

```typescript
import { createReader } from "@prose-reader/core";
import {
  generateManifestFromArchive,
  generateResourceFromArchive,
} from "@prose-reader/streamer";
import { createArchiveFromJszip } from "@prose-reader/streamer/archives/createArchiveFromJszip";
import JSZip from "jszip";

const reader = createReader({
  containerElement: document.getElementById("app")!,
});

(async () => {
  const content = await fetch("content.epub");

  const zip = new JSZip();
  await zip.loadAsync(await content.blob());
  
  // we create the archive from our epub zip container
  const archive = await createArchiveFromJszip(zip);  

  // the streamer can generate a manifest from various source 
  // including jszip archive
  const manifest = await generateManifestFromArchive(archive);

  reader.load(manifest, {
    // By default prose will fetch the resources via http. In our case we don't have
    // a server or a service worker so we want to serve the resource directly from
    // this script.
    fetchResource: async (item) => {
      // The streamer will automatically serve the correct resource for each item
      // provided the correct href and archive.
      const resource = await generateResourceFromArchive(archive, item.href);

      return new Response(resource.body, { ...resource.params, status: 200 });
    },
  });
})();
```

