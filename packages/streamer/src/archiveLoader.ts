import type { Archive } from "@prose-reader/archive-reader"
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  EMPTY,
  filter,
  first,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  NEVER,
  Observable,
  type ObservedValueOf,
  pairwise,
  Subject,
  shareReplay,
  startWith,
  switchMap,
  tap,
  timer,
} from "rxjs"
import { Report } from "./report"

class ArchiveEntry {
  state$ = new BehaviorSubject<{
    status: "idle" | "loading" | "success" | "error"
    error?: unknown | undefined
    archive?: undefined | Archive
    locks: number
  }>({
    status: `idle`,
    locks: 0,
  })

  constructor(private cleanArchiveAfter: number) {}

  update(update: Partial<ObservedValueOf<typeof this.state$>>) {
    this.state$.next({ ...this.state$.getValue(), ...update })
  }

  get locks$() {
    return this.state$.pipe(map(({ locks }) => locks))
  }

  get state() {
    return this.state$.getValue()
  }

  get isUnlocked$() {
    return this.locks$.pipe(
      map((locks) => locks <= 0),
      distinctUntilChanged(),
      shareReplay(),
    )
  }

  get overTTL$() {
    return this.isUnlocked$.pipe(
      switchMap((isUnlocked) =>
        !isUnlocked
          ? NEVER
          : this.cleanArchiveAfter === Infinity
            ? NEVER
            : timer(this.cleanArchiveAfter),
      ),
    )
  }
}

export const createArchiveLoader = ({
  getArchive,
  cleanArchiveAfter = 5 * 60 * 1000, // 5mn
}: {
  getArchive: (key: string) => Promise<Archive>
  cleanArchiveAfter?: number
}) => {
  const loadSubject = new Subject<string>()
  const purgeSubject = new Subject<void>()
  const archives: Record<string, ArchiveEntry> = {}

  const loadArchive$ = loadSubject.pipe(
    mergeMap((key) => {
      const archiveEntry = archives[key]

      if (archiveEntry?.state.status !== "idle") return EMPTY

      let isClosed = false

      const cleanupArchive = (key: string) => {
        Report.debug(`Cleaning up archive with key: ${key}`)

        const entry = archives[key]

        delete archives[key]

        if (!isClosed) {
          entry?.state.archive?.close()
          isClosed = true
        }
      }

      archiveEntry.update({
        status: "loading",
      })

      const locks$ = archiveEntry.locks$
      const isUnlocked$ = archiveEntry.isUnlocked$

      const newAccess$ = locks$.pipe(
        pairwise(),
        filter(([prev, curent]) => curent > prev),
        startWith(true),
      )

      const archive$ = from(getArchive(key))

      return archive$.pipe(
        tap((archive) => {
          archiveEntry.update({
            archive,
            status: "success",
          })
        }),
        catchError((error) => {
          cleanupArchive(key)

          archiveEntry.update({
            status: "error",
            error,
          })

          return EMPTY
        }),
        switchMap(() => {
          const readyForPurge$ = newAccess$.pipe(
            switchMap(() => purgeSubject),
            switchMap(() => isUnlocked$),
            filter((isUnlocked) => isUnlocked),
          )

          const toCleanup$ = merge(readyForPurge$, archiveEntry.overTTL$)

          return toCleanup$.pipe(
            first(),
            tap(() => {
              cleanupArchive(key)
            }),
          )
        }),
      )
    }),
  )

  /**
   * Emits the archive of `key`, loading it on the first access, and holds it
   * until the subscription ends. An archive closes only once nothing holds
   * it: `cleanArchiveAfter` later, or at once on a `purge`. Errors when the
   * archive fails to load.
   */
  const access = (key: string) =>
    new Observable<Archive>((subscriber) => {
      const archiveEntry = archives[key] ?? new ArchiveEntry(cleanArchiveAfter)

      archives[key] = archiveEntry

      archiveEntry.update({
        locks: archiveEntry.state.locks + 1,
      })

      loadSubject.next(key)

      const loadedArchive$ = archiveEntry.state$.pipe(
        map(({ archive }) => archive),
        filter((archive): archive is Archive => archive !== undefined),
      )

      const loadError$ = archiveEntry.state$.pipe(
        tap(({ error }) => {
          if (error) {
            throw error
          }
        }),
        ignoreElements(),
      )

      const loadSubscription = merge(loadedArchive$, loadError$)
        .pipe(first())
        .subscribe({
          next: (archive) => subscriber.next(archive),
          error: (error) => subscriber.error(error),
        })

      return function releaseArchive() {
        loadSubscription.unsubscribe()

        archiveEntry.update({
          locks: archiveEntry.state.locks - 1,
        })
      }
    })

  /**
   * Will purge immediatly archives as soon as they are released
   */
  const purge = () => {
    purgeSubject.next()
  }

  loadArchive$.subscribe()

  return {
    access,
    purge,
    _archives: archives,
  }
}
