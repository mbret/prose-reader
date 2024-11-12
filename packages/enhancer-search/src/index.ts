/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reader } from "@prose-reader/core"
import { forkJoin, from, merge, Observable, of, Subject } from "rxjs"
import { map, share, switchMap, takeUntil } from "rxjs/operators"

const supportedContentType: DOMParserSupportedType[] = [
  `application/xhtml+xml`,
  `application/xml`,
  `image/svg+xml`,
  `text/html`,
  `text/xml`,
]

const isSupportedContentType = (contentType: string): contentType is DOMParserSupportedType => {
  return supportedContentType.includes(contentType as DOMParserSupportedType)
}

type ResultItem = {
  spineItemIndex: number
  startCfi: string
  endCfi: string
  pageIndex?: number
  contextText: string
  startOffset: number
  endOffset: number
}

export type SearchResult = ResultItem[]

/**
 *
 */
export const searchEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    search: {
      search: (text: string) => void
      $: {
        search$: Observable<{ type: `start` } | { type: `end`; data: SearchResult }>
      }
    }
  } => {
    const reader = next(options)

    const searchSubject$ = new Subject<string>()

    const searchNodeContainingText = (node: Node, text: string) => {
      const nodeList = node.childNodes

      if (node.nodeName === `head`) return []

      const rangeList: {
        startNode: Node
        start: number
        endNode: Node
        end: number
      }[] = []
      for (let i = 0; i < nodeList.length; i++) {
        const subNode = nodeList[i]

        if (!subNode) {
          continue
        }

        if (subNode?.hasChildNodes()) {
          rangeList.push(...searchNodeContainingText(subNode, text))
        }

        if (subNode.nodeType === 3) {
          const content = (subNode as Text).data.toLowerCase()
          if (content) {
            let match
            const regexp = RegExp(`(${text})`, `g`)

            while ((match = regexp.exec(content)) !== null) {
              if (match.index >= 0 && subNode.ownerDocument) {
                const range = subNode.ownerDocument.createRange()
                range.setStart(subNode, match.index)
                range.setEnd(subNode, match.index + text.length)
                rangeList.push({
                  startNode: subNode,
                  start: match.index,
                  endNode: subNode,
                  end: match.index + text.length,
                })
              }
            }
          }
        }
      }

      return rangeList
    }

    const searchForItem = (index: number, text: string) => {
      const item = reader.spineItemsManager.get(index)

      if (!item) {
        return of([])
      }

      return from(item.resourcesHandler.fetchResource()).pipe(
        switchMap((response) => {
          if (!(response instanceof Response)) {
            return of([])
          }

          const contentType = response?.headers.get(`Content-Type`) ?? ``

          // small optimization since we already know DOMParser only accept some documents only
          // the reader returns us a valid HTML document anyway so it is not ultimately necessary.
          // however we can still avoid doing unnecessary HTML generation for images resources, etc.
          if (!isSupportedContentType(contentType)) return of([])

          return from(response.text()).pipe(
            map((responseText) => {
              const parser = new DOMParser()
              const doc = parser.parseFromString(responseText, contentType)

              const ranges = searchNodeContainingText(doc, text)

              const newResults = ranges.map((range) => {
                const { end, start } = reader.cfi.generateCfiFromRange(range, item.item)
                const { node, offset, spineItemIndex } = reader.cfi.resolveCfi({ cfi: start }) || {}
                const pageIndex =
                  node && spineItemIndex !== undefined
                    ? reader.spine.locator.getSpineItemPageIndexFromNode(node, offset, spineItemIndex)
                    : undefined

                return {
                  spineItemIndex: index,
                  startCfi: start,
                  endCfi: end,
                  pageIndex,
                  contextText: range.startNode.parentElement?.textContent || ``,
                  startOffset: range.start,
                  endOffset: range.end,
                }
              })

              return newResults
            }),
          )
        }),
      )
    }

    const search = (text: string) => {
      searchSubject$.next(text)
    }

    /**
     * Main search process stream
     */
    const search$ = merge(
      searchSubject$.asObservable().pipe(map(() => ({ type: `start` as const }))),
      searchSubject$.asObservable().pipe(
        switchMap((text) => {
          if (text === ``) {
            return of([])
          }

          const searches$ = reader.context.manifest?.spineItems.map((_, index) => searchForItem(index, text)) || []

          return forkJoin(searches$).pipe(
            map((results) => {
              return results.reduce((acc, value) => [...acc, ...value], [])
            }),
          )
        }),
        map((data) => ({ type: `end` as const, data })),
      ),
    ).pipe(share(), takeUntil(reader.$.destroy$))

    const destroy = () => {
      searchSubject$.complete()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      search: {
        search,
        $: {
          search$,
        },
      },
    }
  }
