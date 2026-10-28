import type { CreateReaderOptions, Reader } from "@prose-reader/core"
import { from, map, mergeMap, of } from "rxjs"
import { isPdfJsArchive } from "./createArchiveFromPdf"
import { PdfRenderer } from "./renderer/PdfRenderer"
import type { EnhancerOptions } from "./types"

export const pdfEnhancer =
  <
    InheritOptions extends Pick<
      CreateReaderOptions,
      "getRenderer" | "getResource"
    >,
    InheritOutput extends Reader,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & EnhancerOptions): InheritOutput => {
    const reader = next({
      ...options,
      /**
       * We have a special renderer for pdf so we need to inject it
       * for the relevant items. The enhancer could be configurable but for
       * the sake of simplicity we will assume that an item ending with .pdf should
       * be treated as a pdf document.
       *
       * The `getRenderer` hook should be non destructive, if we detect a renderer already
       * setup we should return it.
       */
      getRenderer(item) {
        const maybeFactory = options.getRenderer?.(item)

        if (!maybeFactory && item.containerUri.endsWith(`.pdf`)) {
          return (params) =>
            new PdfRenderer(options.pdf.pdfjsViewerInlineCss, params)
        }

        return maybeFactory
      },
      getResource: (item) =>
        options.pdf.getArchiveForItem(item).pipe(
          mergeMap((archive) => {
            if (!archive) return of(undefined)

            if (!isPdfJsArchive(archive)) {
              console.warn(`You provided an invalid pdf archive`)

              return of(undefined)
            }

            // `createArchiveFromPdf` holds its package document, then one
            // record per page in page order, so the record a page's spine
            // item shows is at its page number. A resource is requested by
            // its manifest entry, which does not name its record: the spine
            // item of the same id does.
            const containerUri = reader.spineItemsManager.get(item.id)?.item
              .containerUri
            const pageNumber = archive.records.findIndex(
              (file) => file.uri === containerUri,
            )

            return from(archive.proxyDocument.getPage(pageNumber)).pipe(
              map((pageProxy) => ({
                custom: true as const,
                data: pageProxy,
              })),
            )
          }),
        ),
    })

    return reader
  }
