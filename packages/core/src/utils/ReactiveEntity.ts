import { isShallowEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
  takeUntil,
} from "rxjs"
import { watchKeys } from "./rxjs"

/**
 * Convenience class to manage reactive entities.
 * Used across the codebase.
 *
 * Embed within commonly used methods.
 */
export class ReactiveEntity<
  T extends Record<string, unknown>,
> extends Observable<T> {
  protected stateSubject: BehaviorSubject<T>
  protected _destroy$ = new Subject<void>()
  protected isDestroyed = false

  public state$: Observable<T>

  constructor(initialState: T) {
    super((subscriber) => {
      const sub = this.stateSubject
        .pipe(takeUntil(this._destroy$))
        .subscribe(subscriber)

      return sub
    })
    this.stateSubject = new BehaviorSubject<T>(initialState)
    this.state$ = this.stateSubject.asObservable()
  }

  protected next(value: T) {
    this.stateSubject.next(value)
  }

  /**
   * Default shallow compare.
   */
  protected mergeCompare(pagination: Partial<T>) {
    const newValue = { ...this.value, ...pagination }

    if (isShallowEqual(this.value, newValue)) return

    this.stateSubject.next(newValue)
  }

  public watch<K extends keyof T>(key: K): Observable<T[K]>
  public watch<K extends keyof T>(keys: K[]): Observable<Pick<T, K>>
  public watch<K extends keyof T>(keyOrKeys: K | K[]) {
    if (Array.isArray(keyOrKeys)) {
      return this.stateSubject.pipe(watchKeys(keyOrKeys))
    }
    return this.stateSubject.pipe(
      map((result) => result[keyOrKeys]),
      distinctUntilChanged(isShallowEqual),
    )
  }

  public get value() {
    return this.stateSubject.value
  }

  public destroy$ = this._destroy$.asObservable()

  public destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true

    this.stateSubject.complete()
    // emit before completing, `takeUntil(destroy$)` only reacts to emissions
    this._destroy$.next()
    this._destroy$.complete()
  }
}
