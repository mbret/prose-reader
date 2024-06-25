import { EMPTY, Observable, Subject, combineLatest, of, tap } from "rxjs"

type UserDestroyFn = () => void | Observable<unknown>

type Params = { destroy$: Observable<void>; destroy: (fn: UserDestroyFn) => void; itemId: string; frame: HTMLIFrameElement }

type Hook = { name: `item.onLoad`; runFn: (params: Params) => Observable<void> }
type HookExecution = { name: string; id: string; destroyFn: () => Observable<unknown>; ref: Hook }

export class HookManager {
  _hooks: Array<Hook> = []
  _hookExecutions: Array<HookExecution> = []

  /**
   * Will:
   * - call destroy function for every execution of this specific hook
   * - remove the hook for further calls
   */
  _deregister(hookToDeregister: Hook) {
    this._hooks = this._hooks.filter((hook) => hook !== hookToDeregister)

    return this.destroy(hookToDeregister.name, undefined, hookToDeregister)
  }

  /**
   * Ideal when your logic only needs to apply something to the item when it's loaded.
   * You can manipulate your item later if you need to update it and trigger a layout.
   * This logic will not run every time there is a layout.
   */
  public register(name: `item.onLoad`, fn: (params: Params) => void | Observable<void>) {
    const hook: Hook = {
      name,
      runFn: (params: Params) => {
        const returnValue = fn(params)

        if (!returnValue) return of(undefined)

        return returnValue
      },
    }

    this._hooks.push(hook)

    return () => {
      this._deregister(hook)
    }
  }

  public execute(name: `item.onLoad`, id: string, params: Omit<Params, "destroy$" | "destroy">) {
    const hooks = this._hooks.filter((hookInstance) => name === hookInstance.name)

    const runFns = hooks.map((hook) => {
      let userDestroyFn: UserDestroyFn = () => EMPTY

      const destroySubject = new Subject<void>()
      const destroy = (fn: UserDestroyFn) => {
        userDestroyFn = fn
      }

      const destroyFn = () => {
        destroySubject.next()
        destroySubject.complete()

        const result = userDestroyFn()

        return result ?? EMPTY
      }

      const execution = hook.runFn({ ...params, destroy$: destroySubject.asObservable(), destroy })

      this._hookExecutions.push({
        name,
        id,
        destroyFn,
        ref: hook,
      })

      return execution
    })

    console.log({ hooks, runFns })
    return combineLatest(runFns)
  }

  public destroy(name: `item.onLoad`, id?: string, ref?: Hook) {
    const instances = this._hookExecutions.filter(
      (hookInstance) =>
        // by ref is higher priority
        (ref && hookInstance.ref === ref) ||
        // otherwise we refine by name and eventually by id
        (name === hookInstance.name && (!id || (id && id === hookInstance.id))),
    )

    // remove destroyed instances from internal list
    this._hookExecutions = this._hookExecutions.filter((instance) => !instances.includes(instance))

    const destroyFns = instances.map(({ destroyFn }) => destroyFn())

    return combineLatest(destroyFns)
  }
}
