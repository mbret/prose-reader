import { createReader, Reader } from "@prose-reader/core"
import { PdfRenderer } from "./PdfRenderer"

type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]

export const pdfEnhancer =
  <InheritOptions extends CreateReaderOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput => {
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
        const MaybeRenderer = options.getRenderer?.(item)

        if (!MaybeRenderer && item.href.endsWith(`.pdf`)) {
          return PdfRenderer
        }

        return MaybeRenderer
      },
    })

    return reader
  }
