import { Enhancer } from "@oboku/reader"
import { forkJoin, from, merge, Observable, of, Subject } from "rxjs"
import { delay, map, switchMap, takeUntil } from "rxjs/operators"

type ResultItem = {
  spineItemIndex: number,
  startCfi: string,
  endCfi: string,
  pageIndex?: number,
  contextText: string
}

const supportedContentType = ["application/xhtml+xml" as const, "application/xml" as const, "image/svg+xml" as const, "text/html" as const, "text/xml" as const]

export type SearchResult = ResultItem[]

/**
 *
 */
export const searchEnhancer: Enhancer<{
  search: {
    search: (text: string) => void
    search$: Observable<{ type: 'start' } | { type: 'end', data: SearchResult }>
  }
}> = (next) => (options) => {
  const reader = next(options)
  const searchSubject$ = new Subject<string>()
  const searchResultsSubject$ = new Subject<SearchResult>()

  const searchNodeContainingText = (node: Node, text: string) => {
    const nodeList = node.childNodes

    const rangeList: { startNode: Node, start: number, endNode: Node, end: number }[] = []
    for (let i = 0; i < nodeList.length; i++) {
      const subNode = nodeList[i]

      if (!subNode) {
        continue
      }
      // console.log(subNode)

      if (subNode?.hasChildNodes()) {
        rangeList.push(...searchNodeContainingText(subNode, text))
      }

      if (subNode.nodeType == 3) {
        const content = (subNode as Text).data.toLowerCase()
        if (content) {
          let match
          const regexp = RegExp(`(${text})`, 'g')

          while ((match = regexp.exec(content)) !== null) {
            // console.log(match)
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
    return new Observable<SearchResult>((subscriber) => {

      const item = reader.getReadingItem(index)

      if (!item) {
        subscriber.next([])
        subscriber.complete()

        return
      }

      from(item.fetchResource())
        .pipe(
          switchMap((response) => {
            const data$ = response ? from(response.text()) : of(undefined)

            return forkJoin([of(response), data$])
          }),
          map(([response, data]) => {
            if (!data || !response) return []

            if (data) {
              const parser = new DOMParser()
              const contentType = response?.headers.get('Content-Type') || ``
              if (supportedContentType.includes(contentType as any)) {
                const doc = parser.parseFromString(data, contentType as typeof supportedContentType[number])
  
                const ranges = searchNodeContainingText(doc, text)
                const newResults = ranges.map(range => {
                  const { end, start } = reader.generateCfi(range, item.item)
                  const { pageIndex } = reader.resolveCfi(start) || {}
  
                  return {
                    spineItemIndex: index,
                    startCfi: start,
                    endCfi: end,
                    pageIndex,
                    contextText: range.startNode.parentElement?.textContent || '',
                  }
                })
  
                return newResults
              }
            }
          })
        )
        .subscribe(subscriber)
    })
  }

  const search = (text: string) => {
    searchSubject$.next(text)
  }

  searchSubject$.asObservable()
    .pipe(
      switchMap((text) => {
        if (text === '') {
          return of([])
        }

        const searches$ = reader.context.getManifest()?.readingOrder.map((_, index) => searchForItem(index, text)) || []

        return forkJoin(searches$)
          .pipe(
            map(results => results.reduce((acc, value) => [...acc, ...value], [])),
          )
      }),
      delay(0), // make sure subjects are in order
      takeUntil(reader.destroy$),
    )
    .subscribe(searchResultsSubject$)

  const search$ = merge(
    searchSubject$
      .pipe(map(() => ({ type: `start` as const }))),
    searchResultsSubject$
      .pipe(map((data) => ({ type: `end` as const, data })))
  )

  const destroy = () => {
    searchSubject$.complete()
    searchResultsSubject$.complete()
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
    search: {
      search,
      search$
    }
  }
}