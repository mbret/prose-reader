import { Observable, takeUntil } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { DestroyableClass } from "./DestroyableClass"
import { ReactiveEntity } from "./ReactiveEntity"

const createRecordedSource = () => {
  const subscribeToSource = vi.fn()
  const source$ = new Observable<never>(function recordSubscription() {
    subscribeToSource()
  })

  return { source$, subscribeToSource }
}

class DestroyableProbe extends DestroyableClass {
  takeUntilDestroyed = <T>(source$: Observable<T>) =>
    source$.pipe(takeUntil(this.destroy$))
}

describe("destroy$", () => {
  it("ends a takeUntil subscribed after a ReactiveEntity is destroyed, without subscribing its source", () => {
    const entity = new ReactiveEntity({ value: 1 })
    const { source$, subscribeToSource } = createRecordedSource()
    const complete = vi.fn()

    entity.destroy()
    source$.pipe(takeUntil(entity.destroy$)).subscribe({ complete })

    expect(subscribeToSource).not.toHaveBeenCalled()
    expect(complete).toHaveBeenCalledOnce()
  })

  it("ends a takeUntil subscribed after a DestroyableClass is destroyed, without subscribing its source", () => {
    const probe = new DestroyableProbe()
    const { source$, subscribeToSource } = createRecordedSource()
    const complete = vi.fn()

    probe.destroy()
    probe.takeUntilDestroyed(source$).subscribe({ complete })

    expect(subscribeToSource).not.toHaveBeenCalled()
    expect(complete).toHaveBeenCalledOnce()
  })
})
