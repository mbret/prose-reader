# PDF

This enhancer lets you render PDF documents. The reason it's not part of the core is because PDFs requires an extra dependencies and have a rather specific & much different way to be rendered. Having it as a core would increase the core size significantly and increase complexity while not everyone needs to render pdf.

{% hint style="warning" %}
PDFs are incompatible with service workers due to the limitation from the library used [https://mozilla.github.io/pdf.js/](https://mozilla.github.io/pdf.js/). The archive, resources and rendering will all happens on the client side. There is nothing wrong with it except that it cannot be in your service worker streamer flow (if you use this flow).
{% endhint %}

## Important

PDFs are incompatible with service workers due to the limitation from the library used [https://mozilla.github.io/pdf.js/](https://mozilla.github.io/pdf.js/). The archive, resources and rendering will all happens on the client side. There is nothing wrong with it except that it cannot be in your service worker streamer flow (if you use this flow).

The enhancer will hook into the resource loading and rendering process to handle the pdf for you. No resources will need to be fetched through HTTP requests.

## Getting started

{% hint style="info" %}
We encourage you to visit the [prose reader demo repository ](https://github.com/mbret/prose-reader/tree/master/packages/demo)to see how the enhancer is being used in a real world example.
{% endhint %}

```bash
npm install @prose-reader/enhancer-pdf pdfjs-dist
```

The following integration example is simplified and does not use streamers. The prose reader demo use a client streamer to streamline the process and have a more unified way to stream documents but it's not required. Since the package provides an archive creator helper it can be used as any other archives.

<pre class="language-typescript"><code class="lang-typescript">import { of, from } from "rxjs"
<strong>import { pdfEnhancer, createArchiveFromPdf } from "@prose-reader/enhancer-pdf"
</strong>import { generateManifestFromArchive } from "@prose-reader/streamer"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
// You need to import inline the css of the pdf viewer. It is needed
// by the enhancer to inject it in the document and have annotation layer.
// The css is big so we don't embed it in the source code.
import pdfjsViewerInlineCss from "pdfjs-dist/web/pdf_viewer.css?inline"

// Initialize the pdfjs worker somewhere in your code. 
// Something like an index file or your streamer may be a good idea. Please check 
// https://mozilla.github.io/pdf.js/
// for more information. Below is an example with vite bundler.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(pdfWorkerUrl, import.meta.url).toString()

const createAppReader = pdfEnhancer(createReader)

const run = async () => {
    // This is a simplified way for example purpose.
    // You may retrieve your document in different ways
    const pdfBlob = await localforage.getItem(`myPdf.pdf`)
    // Once you have an archive, you can use it to
    // generate manifest and or provide it to the enhancer.
    // It is not required per se but will blend better with prose flow
    const archive = await createArchiveFromPdf(pdfBlob)
    
    const reader = createAppReader({
        pdf: {
            pdfjsViewerInlineCss,
            // Assuming we load different books, we want
            // to have whatever check is necessary to tell
            // the enhancer to use the archive on specific
            // items only
            getArchiveForItem: item => {
                if (item.href.endsWith(`.pdf`)) {
                    return of(archive)
                }
                
                return of(undefined)
            }
        }
    })
    
    reader.load({
        containerElement: document.getElementById(`reader`),
        // The generated manifest will have uri that matches the
        // archive files. If you let it by default, the 
        // enhancer will be able to automatically retrieve the pages
        manifest: await generateManifestFromArchive(archive)
    })
    
    reader.destroy$.subscribe(() => {
        // don't forget to close your archive once you
        // are done with it. It will free up the resources
        // used by pdfjs automatically
        archive.close()
    })
}

run()
</code></pre>

