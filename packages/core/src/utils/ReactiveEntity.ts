import { isShallowEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  type Observable,
  Subject,
  distinctUntilChanged,
  map,
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
> extends BehaviorSubject<T> {
  protected destroy$ = new Subject<void>()

  public update(value: Partial<T>) {
    this.next({ ...this.value, ...value })
  }

  public watch<K extends keyof T>(key: K): Observable<T[K]>
  public watch<K extends keyof T>(keys: K[]): Observable<Pick<T, K>>
  public watch<K extends keyof T>(keyOrKeys: K | K[]) {
    if (Array.isArray(keyOrKeys)) {
      return this.pipe(watchKeys(keyOrKeys))
    }
    return this.pipe(
      map((result) => result[keyOrKeys]),
      distinctUntilChanged(isShallowEqual),
    )
  }

  public destroy() {
    this.destroy$.complete()
  }
}
