import type { Observable } from "rxjs"

export type ResultItem = {
  cfi: string
}

export type SearchResult = ResultItem[]

export type SearchEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_SEARCH: boolean
  search: {
    search: (text: string) => Observable<SearchResult>
  }
}
