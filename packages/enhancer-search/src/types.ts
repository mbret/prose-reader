import type { Observable } from "rxjs"
import type { SearchResult } from "./search"

export type ResultItem = {
  cfi: string
}

export type SearchEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_SEARCH: boolean
  search: {
    search: (text: string) => Observable<SearchResult>
  }
}
