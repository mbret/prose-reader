/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subject, combineLatest, of } from "rxjs"
import { CoreHook, Hook, HookExecution, HookFrom } from "./types"
import { UserDestroyFn } from "./types"

export class HookManager<H extends Hook<any, any, any> = CoreHook> {
  _hooks: Array<H> = []
  _hookExecutions: Array<HookExecution<H>> = []

  /**
   * Will:
   * - call destroy function for every execution of this specific hook
   * - remove the hook for further calls
   */
  protected deregister(hookToDeregister: H) {
    this._hooks = this._hooks.filter((hook) => hook !== hookToDeregister)

    return this.destroy(hookToDeregister.name, undefined, hookToDeregister)
  }

  /**
   * Ideal when your logic only needs to apply something to the item when it's loaded.
   * You can manipulate your item later if you need to update it and trigger a layout.
   * This logic will not run every time there is a layout.
   */
  public register<Name extends H["name"]>(name: Name, fn: HookFrom<H, Name>["runFn"]) {
    const hook = {
      name,
      runFn: fn,
    }

    this._hooks.push(hook as H)

    return () => {
      this.deregister(hook as H)
    }
  }

  public execute<Name extends H["name"]>(
    name: Name,
    id: string | undefined,
    params: Omit<Parameters<HookFrom<H, Name>["runFn"]>[0], "destroy" | "destroy$">,
  ): ReturnType<HookFrom<H, Name>["runFn"]>[] {
    const hooks = this._hooks.filter((hook): hook is HookFrom<H, Name> => name === hook.name)

    const fnResults = hooks.map((hook) => {
      let userDestroyFn: UserDestroyFn = () => of(undefined)

      const destroySubject = new Subject<void>()
      const destroy = (fn: UserDestroyFn) => {
        userDestroyFn = fn
      }

      const destroyFn = () => {
        destroySubject.next()
        destroySubject.complete()

        const result = userDestroyFn()

        return result ?? of(undefined)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fnResult = hook.runFn({ ...(params as any), destroy$: destroySubject.asObservable(), destroy })

      this._hookExecutions.push({
        name,
        id,
        destroyFn,
        ref: hook,
      })

      return fnResult
    })

    return fnResults
  }

  public destroy<Name extends H["name"]>(name: Name, id?: string, ref?: H) {
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
