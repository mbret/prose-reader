import { useConstant, useObserve } from "reactjrx"
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  merge,
  of,
  switchMap,
  timer,
} from "rxjs"
import { hasSearchEnhancer, useReader } from "../context/useReader"

const DEBOUNCE_TIME = 500

export const useSearch = () => {
  const searchSubject = useConstant(() => new BehaviorSubject(""))
  const searchValue = useObserve(searchSubject)
  const reader = useReader()
  const readerWithSearch = hasSearchEnhancer(reader) ? reader : undefined

  const search = useObserve(() => {
    return searchSubject.pipe(
      distinctUntilChanged(),
      switchMap((value) =>
        value === "" || !readerWithSearch
          ? of(undefined)
          : merge(
              of({
                type: `start` as const,
                data: undefined,
              }),
              timer(DEBOUNCE_TIME).pipe(
                switchMap(() => readerWithSearch.search.search(value)),
                map((data) => ({ type: `end` as const, data })),
              ),
            ),
      ),
    )
  }, [readerWithSearch, searchSubject])

  return {
    value: searchValue,
    setValue: searchSubject.next.bind(searchSubject),
    status: search?.type ?? "idle",
    data: search?.data,
  }
}
