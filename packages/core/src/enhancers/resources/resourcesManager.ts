/**
 * @todo web worker
 */
import { EMPTY, Subject, forkJoin, from, merge } from "rxjs"
import {
  catchError,
  map,
  mergeMap,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { Manifest } from "../.."
import type { Context } from "../../context/Context"
import { Report } from "../../report"
import { openDatabase } from "./indexedDB"

export const createResourcesManager = (context: Context) => {
  let uniqueID = Date.now().toString()
  const cache$ = new Subject<{
    id: number | Pick<Manifest[`spineItems`][number], `id`>
    data: Response
  }>()

  const retrieveItem = (
    itemIndexOrId: number | string | Pick<Manifest[`spineItems`][number], `id`>,
  ) => {
    if (
      typeof itemIndexOrId === "string" ||
      typeof itemIndexOrId === "object"
    ) {
      const id =
        typeof itemIndexOrId === "object" ? itemIndexOrId.id : itemIndexOrId
      return context.manifest?.spineItems.find((entry) => entry.id === id)
    }

    return context.manifest?.spineItems[itemIndexOrId]
  }

  const get = async (
    itemIndexOrId: number | Pick<Manifest[`spineItems`][number], `id`>,
    fetchResource?: (item: Manifest[`spineItems`][number]) => Promise<Response>,
  ) => {
    const item = retrieveItem(itemIndexOrId)

    if (!item) return new Response(`Item not found`, { status: 404 })

    const db = await openDatabase(`prose-reader`)

    const cacheData = await db.get(`${uniqueID}_${item.id}`)

    if (cacheData) {
      return new Response(cacheData, { status: 200 })
    }

    const data =
      (fetchResource && (await fetchResource(item))) || (await fetch(item.href))

    cache(item, data.clone())

    return data
  }

  const cache = (
    itemIndexOrId: number | Pick<Manifest[`spineItems`][number], `id`>,
    data: Response,
  ) => {
    cache$.next({ id: itemIndexOrId, data })
  }

  cache$
    .asObservable()
    .pipe(
      mergeMap(({ id, data }) => {
        const item = retrieveItem(id)

        if (!item) return EMPTY

        return from(
          forkJoin([openDatabase(`prose-reader`), from(data.blob())]),
        ).pipe(
          switchMap(([db, blob]) => {
            return from(db.put(`${uniqueID}_${item.id}`, blob))
          }),
          catchError((error) => {
            Report.error(error)

            return EMPTY
          }),
        )
      }),
      takeUntil(context.destroy$),
    )
    .subscribe()

  const onLoad$ = context.manifest$.pipe(
    tap(() => {
      uniqueID = Date.now().toString()
    }),
  )

  /**
   * Cleanup old cache on startup if needed
   * @todo
   * do on first time and only then on subsequent load
   */
  merge(onLoad$)
    .pipe(
      switchMap(() => {
        Report.debug(`Cleanup up old cache...`)

        return from(openDatabase(`prose-reader`)).pipe(
          switchMap((db) =>
            from(db.keys()).pipe(
              map((keys) =>
                keys.filter((key) => !key.toString().startsWith(uniqueID)),
              ),
              switchMap((keysToRemove) => {
                const promises = keysToRemove.map((key) => db.remove(key))

                return from(Promise.all(promises))
              }),
            ),
          ),
          catchError((error) => {
            Report.error(error)

            return EMPTY
          }),
        )
      }),
      takeUntil(context.destroy$),
    )
    .subscribe()

  const destroy = () => {
    cache$.complete()
  }

  return {
    get,
    destroy,
  }
}
