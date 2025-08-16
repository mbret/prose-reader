import type { createReader, Reader } from "@prose-reader/core"
import { from, map, mergeMap, of } from "rxjs"
import { isPdfJsArchive } from "./createArchiveFromPdf"
import { PdfRenderer } from "./renderer/PdfRenderer"
import type { EnhancerOptions } from "./types"

type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]

export const pdfEnhancer =
  <InheritOptions extends CreateReaderOptions, InheritOutput extends Reader>(
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

        if (!maybeFactory && item.href.endsWith(`.pdf`)) {
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

            // we account for opf file
            const fileIndex =
              archive.records.findIndex((file) =>
                item.href.endsWith(file.uri),
              ) - 1

            return from(archive.proxyDocument.getPage(fileIndex + 1)).pipe(
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
