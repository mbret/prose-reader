import { BehaviorSubject, Subject } from "rxjs"

export class DestroyableBehaviorSubject<T> extends BehaviorSubject<T> {
  protected destroy$ = new Subject<void>()

  public destroy() {
    this.destroy$.complete()
  }
}
