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
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { Archive } from "./types"

type ArchiveEntry = {
  status: "idle" | "loading" | "success" | "error"
  error: unknown
  archive: undefined | Archive
  locks: number
}

export const createArchiveLoader = ({
  getArchive,
  cleanArchiveAfter,
}: {
  getArchive: (key: string) => Promise<Archive>
  cleanArchiveAfter: number
}) => {
  const loadSubject = new Subject<string>()
  const destroySubject = new Subject<void>()
  const purgeSubject = new Subject<void>()
  const archives: Record<string, BehaviorSubject<ArchiveEntry>> = {}

  const archiveLoaded$ = loadSubject.pipe(
    mergeMap((key) => {
      const archiveEntry = archives[key]

      if (!archiveEntry || archiveEntry.getValue().status !== "idle")
        return EMPTY

      archiveEntry.next({
        ...archiveEntry.getValue(),
        status: "loading",
      })

      return from(getArchive(key)).pipe(
        map((archive) => {
          archiveEntry.next({
            ...archiveEntry.getValue(),
            archive,
            status: "success",
          })

          return { key, archiveEntry }
        }),
        catchError((error) => {
          archiveEntry.next({
            ...archiveEntry.getValue(),
            status: "error",
            error,
          })

          throw error
        }),
      )
    }),
    catchError(() => NEVER),
    shareReplay(),
  )

  const cleanup$ = archiveLoaded$.pipe(
    switchMap(({ archiveEntry, key }) => {
      const locks$ = archiveEntry.pipe(map(({ locks }) => locks))
      const isPurged$ = purgeSubject.pipe(
        map(() => true),
        startWith(false),
        shareReplay(),
      )
      const isUnlocked$ = locks$.pipe(
        map((locks) => locks <= 0),
        distinctUntilChanged(),
      )

      return isUnlocked$.pipe(
        withLatestFrom(isPurged$),
        switchMap(([isUnlocked, isPurged]) =>
          !isUnlocked ? NEVER : timer(isPurged ? 1 : cleanArchiveAfter),
        ),
        tap(() => {
          console.log("ARCHIVE DELETED")
          delete archives[key]

          archiveEntry.getValue().archive?.close()
        }),
      )
    }),
  )

  const access = (key: string) => {
    let releaseCalled = false

    const archiveEntry =
      archives[key] ??
      new BehaviorSubject<ArchiveEntry>({
        archive: undefined,
        status: "idle",
        locks: 0,
        error: undefined,
      })

    archives[key] = archiveEntry

    archiveEntry.next({
      ...archiveEntry.getValue(),
      locks: archiveEntry.getValue().locks + 1,
    })

    const release = () => {
      if (releaseCalled) return

      releaseCalled = true

      archiveEntry.next({
        ...archiveEntry.getValue(),
        locks: archiveEntry.getValue().locks - 1,
      })
    }

    loadSubject.next(key)

    const archive$ = archiveEntry.pipe(
      map(({ archive }) => archive),
      filter((archive) => !!archive),
    )

    const error$ = archiveEntry.pipe(
      tap(({ error }) => {
        if (error) {
          throw error
        }
      }),
      ignoreElements(),
    )

    return merge(archive$, error$).pipe(
      first(),
      map((archive) => ({ archive, release })),
      catchError((error) => {
        release()

        throw error
      }),
    )
  }

  /**
   * Will purge immediatly archives as soon as they are released
   */
  const purge = () => purgeSubject.next()

  merge(cleanup$, archiveLoaded$).pipe(takeUntil(destroySubject)).subscribe()

  return {
    access,
    purge,
  }
}
