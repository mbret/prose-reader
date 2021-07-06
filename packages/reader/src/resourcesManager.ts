import { defer, EMPTY, Observable, Subject } from "rxjs";
import { mergeMap, takeUntil } from "rxjs/operators";
import { Context } from "./context";

export const createResourcesManager = (context: Context) => {
  const cache$ = new Subject<number>()

  const get = (itemIndexOrId: number): Observable<Response | undefined> => {
    const item = context.getManifest()?.readingOrder.find((item, index) => index === itemIndexOrId)

    if (!item) return defer(() => undefined)

    return defer(() => fetch(item.href))
  }

  const cache = (itemIndexOrId: number) => {
    cache$.next(itemIndexOrId)
  }

  cache$.asObservable()
    .pipe(
      mergeMap((itemIndexOrId) => {
        const item = context.getManifest()?.readingOrder.find((item, index) => index === itemIndexOrId)

        console.log('cache', itemIndexOrId)
        return EMPTY
      }),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  return {
    get,
    cache,
  }
}