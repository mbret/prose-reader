import type { CreateReaderOptions, Reader } from "@prose-reader/core"
import { PdfRenderer } from "./renderer/PdfRenderer"
import type { EnhancerOptions } from "./types"

export const pdfEnhancer =
  <
    InheritOptions extends Pick<CreateReaderOptions, "getRenderer">,
    InheritOutput extends Reader,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & EnhancerOptions): InheritOutput =>
    next({
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
            new PdfRenderer(
              options.pdf.pdfjsViewerInlineCss,
              options.pdf.getArchiveForItem(item),
              params,
            )
        }

        return maybeFactory
      },
    })
