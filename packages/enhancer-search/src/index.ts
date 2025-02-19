import { type Reader, deferIdle } from "@prose-reader/core"
import { defer, forkJoin, of } from "rxjs"
import { catchError, finalize, map, switchMap } from "rxjs/operators"
import { report } from "./report"
import { searchInDocument } from "./search"
import type { SearchEnhancerAPI } from "./types"

export type { SearchEnhancerAPI }

/**
 * Contract of search enhancer.
 *
 * - At best a result match should be navigable. It means the search needs to
 * be done on a rendered document. This is because rendering can differ from the original
 * item resource. A resource can be something indigest and very specific (.pdf). The search
 * enhancer is agnostic and can only search into documents.
 */
export const searchEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & SearchEnhancerAPI => {
    const reader = next(options)

    const searchForItem = (index: number, text: string) => {
      const item = reader.spineItemsManager.get(index)

      if (!item) {
        return of([])
      }

      return deferIdle(() => item.renderer.renderHeadless()).pipe(
        switchMap((result) => {
          const { doc, release } = result || {}

          if (!doc) return of([])

          return deferIdle(() =>
            searchInDocument(reader, item, doc, text),
          ).pipe(
            finalize(() => {
              release?.()
            }),
            catchError((e) => {
              report.error(e)

              return of([])
            }),
          )
        }),
      )
    }

    const search = (text: string) =>
      defer(() => {
        if (text === ``) {
          return of([])
        }

        const searches$ =
          reader.context.manifest?.spineItems.map((_, index) =>
            searchForItem(index, text),
          ) || []

        return forkJoin([...searches$, of([])])
      }).pipe(
        map((results) => {
          const flattenedResults = results.flat()

          report.debug("results", flattenedResults)

          return flattenedResults
        }),
      )

    return {
      ...reader,
      __PROSE_READER_ENHANCER_SEARCH: true,
      search: {
        search,
      },
    }
  }
