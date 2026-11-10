import { ReplaySubject } from "rxjs"

export class DestroyableClass {
  protected isDestroyed = false
  private destroySubject = new ReplaySubject<void>(1)

  /**
   * Emits once the instance is destroyed, then completes. A subscriber that
   * comes after the destroy receives that emission at once.
   */
  protected destroy$ = this.destroySubject.asObservable()

  public destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true

    this.destroySubject.next()
    this.destroySubject.complete()
  }
}
