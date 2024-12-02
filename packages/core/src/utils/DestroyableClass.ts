import { Subject } from "rxjs"

export class DestroyableClass {
  protected isDestroyed = false
  private destroySubject = new Subject<void>()

  protected destroy$ = this.destroySubject.asObservable()

  public destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true

    this.destroySubject.next()
    this.destroySubject.complete()
  }
}
