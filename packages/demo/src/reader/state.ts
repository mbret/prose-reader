import { Reader } from "@prose-reader/core"
import { bind } from "@react-rxjs/core"
import { Observable, switchMap } from "rxjs"

export const [usePagination] = bind(
  (reader$: Observable<Reader>) => reader$.pipe(switchMap((reader) => reader.pagination.state$)),
  undefined
)
