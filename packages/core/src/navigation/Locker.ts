import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

export class Locker {
  protected isLockedSubject = new BehaviorSubject(0)

  public isLocked$ = this.isLockedSubject.pipe(
    map((locked) => !!locked),
    distinctUntilChanged(),
  )

  public lock() {
    let isCalled = false
    this.isLockedSubject.next(this.isLockedSubject.getValue() + 1)

    return () => {
      if (isCalled) return

      isCalled = true

      this.isLockedSubject.next(this.isLockedSubject.getValue() - 1)
    }
  }
}
