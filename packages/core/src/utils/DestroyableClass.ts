import { Subject } from "rxjs"

export class DestroyableClass {
  private destroyed = false
  private destroySubject = new Subject<void>()

  protected destroy$ = this.destroySubject.asObservable()

  /** Whether `destroy()` has been called. */
  public get isDestroyed() {
    return this.destroyed
  }

  public destroy() {
    if (this.destroyed) return

    this.destroyed = true

    this.destroySubject.next()
    this.destroySubject.complete()
  }
}
