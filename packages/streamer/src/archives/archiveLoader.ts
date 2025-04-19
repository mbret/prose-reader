import {
  BehaviorSubject,
  EMPTY,
  NEVER,
  type ObservedValueOf,
  Subject,
  catchError,
  distinctUntilChanged,
  filter,
  first,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  pairwise,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs"
import { Report } from "../report"
import type { Archive } from "./types"

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
  const destroySubject = new Subject<void>()
  const purgeSubject = new Subject<void>()
  const archives: Record<string, ArchiveEntry> = {}

  const loadArchive$ = loadSubject.pipe(
    mergeMap((key) => {
      const archiveEntry = archives[key]

      if (!archiveEntry || archiveEntry.state.status !== "idle") return EMPTY

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

          return merge(readyForPurge$, archiveEntry.overTTL$)
        }),
        tap(() => {
          cleanupArchive(key)
        }),
      )
    }),
    takeUntil(destroySubject),
  )

  const access = (key: string) => {
    let releaseCalled = false

    const archiveEntry = archives[key] ?? new ArchiveEntry(cleanArchiveAfter)

    archives[key] = archiveEntry

    archiveEntry.update({
      locks: archiveEntry.state.locks + 1,
    })

    const release = () => {
      if (releaseCalled) return

      releaseCalled = true

      archiveEntry.update({
        locks: archiveEntry.state.locks - 1,
      })
    }

    loadSubject.next(key)

    const archive$ = archiveEntry.state$.pipe(
      map(({ archive }) => archive),
      filter((archive) => !!archive),
    )

    const error$ = archiveEntry.state$.pipe(
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
  const purge = () => {
    purgeSubject.next()
  }

  loadArchive$.subscribe()

  return {
    access,
    purge,
    archives,
  }
}
