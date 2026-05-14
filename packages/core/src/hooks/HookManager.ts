import { combineLatest, Observable, of } from "rxjs"
import type {
  AsyncHookName,
  AsyncHookParams,
  CoreHook,
  Hook,
  HookExecution,
  HookFrom,
  HookParams,
  HookResult,
  SyncHookName,
} from "./types"

// biome-ignore lint/suspicious/noExplicitAny: TODO
export class HookManager<H extends Hook<any, any, any> = CoreHook> {
  _hooks: Array<H> = []
  _hookExecutions: Array<HookExecution<H>> = []

  private getHooks<Name extends H["name"]>(name: Name) {
    return this._hooks.filter(
      (hook): hook is HookFrom<H, Name> => name === hook.name,
    )
  }

  /**
   * Will:
   * - abort every in-flight execution for this specific hook
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
  public register<Name extends H["name"]>(
    name: Name,
    fn: HookFrom<H, Name>["runFn"],
  ) {
    const hook = {
      name,
      runFn: fn,
    }

    // The hook object is built from generic union pieces that are constrained
    // by register's arguments, but TypeScript cannot recompose that exact
    // union member from name and runFn.
    const registeredHook = hook as H

    this._hooks.push(registeredHook)

    return () => {
      this.deregister(registeredHook)
    }
  }

  public execute<Name extends SyncHookName<H>>(
    name: Name,
    params: HookParams<H, Name>,
  ): HookResult<H, Name>[] {
    return this.getHooks(name).map((hook) => hook.runFn(params))
  }

  /**
   * Runs every async hook registered under `name` in parallel. Each hook gets
   * its own `AbortSignal`. Pass an optional `signal` to globally abort all the
   * hook executions started by this call (the parent's abort propagates to
   * every hook's signal and the executions are removed from internal tracking
   * synchronously, mirroring {@link destroy}).
   */
  public async executeAsync<Name extends AsyncHookName<H>>(
    name: Name,
    id: string | undefined,
    params: Omit<HookParams<H, Name>, keyof AsyncHookParams>,
    signal?: AbortSignal,
  ): Promise<Awaited<HookResult<H, Name>>[]> {
    const hooks = this.getHooks(name)

    if (hooks.length === 0) return Promise.resolve([])

    const hookExecutions = hooks.map((hook) => {
      const abortController = new AbortController()

      return {
        name,
        id,
        ref: hook,
        abortController,
        destroyFn: () => {
          abortController.abort()
          return of(undefined)
        },
      }
    })

    this._hookExecutions.push(...hookExecutions)

    const removeExecution = (execution: (typeof hookExecutions)[number]) => {
      this._hookExecutions = this._hookExecutions.filter(
        (instance) => instance !== execution,
      )
    }

    const onParentAbort = () => {
      for (const execution of hookExecutions) {
        if (!this._hookExecutions.includes(execution)) continue
        execution.abortController.abort()
        removeExecution(execution)
      }
    }

    if (signal?.aborted) {
      onParentAbort()
    } else {
      signal?.addEventListener(`abort`, onParentAbort, { once: true })
    }

    const fnResults = hookExecutions.map(async (execution) => {
      const paramsWithSignal = {
        ...params,
        signal: execution.abortController.signal,
        // TypeScript cannot infer that adding the lifecycle signal completes
        // the generic async hook params object for every hook union member.
      } as HookParams<H, Name>

      try {
        await Promise.resolve()
        return await execution.ref.runFn(paramsWithSignal)
      } finally {
        removeExecution(execution)
      }
    })

    try {
      return await Promise.all(fnResults)
    } finally {
      signal?.removeEventListener(`abort`, onParentAbort)
    }
  }

  /**
   * Observable wrapper around {@link executeAsync}. The hook executions are
   * tied to the subscription lifetime: tearing down the subscription
   * (e.g. via `takeUntil`, a `switchMap` swap, parent unsubscribe) aborts
   * every pending hook signal. Natural completion does not abort.
   */
  public fromExecuteAsync<Name extends AsyncHookName<H>>(
    name: Name,
    id: string | undefined,
    params: Omit<HookParams<H, Name>, keyof AsyncHookParams>,
  ): Observable<Awaited<HookResult<H, Name>>[]> {
    return new Observable((subscriber) => {
      const abortController = new AbortController()

      this.executeAsync(name, id, params, abortController.signal).then(
        (values) => {
          subscriber.next(values)
          subscriber.complete()
        },
        (error) => subscriber.error(error),
      )

      return () => {
        abortController.abort()
      }
    })
  }

  public executeSequential<Name extends SyncHookName<H>>(
    name: Name,
    params: HookParams<H, Name>,
    getNextParams: (
      params: HookParams<H, Name>,
      result: HookResult<H, Name>,
    ) => HookParams<H, Name>,
  ): {
    finalParams: HookParams<H, Name>
    results: HookResult<H, Name>[]
  } {
    let currentParams = params
    const results = this.getHooks(name).map((hook) => {
      const result = hook.runFn(currentParams)

      currentParams = getNextParams(currentParams, result)

      return result
    })

    return {
      finalParams: currentParams,
      results,
    }
  }

  /**
   * Abort in-flight async hook executions by hook name, optional lifecycle id,
   * or registered hook reference.
   */
  public destroy<Name extends H["name"]>(name: Name, id?: string, ref?: H) {
    const instances = this._hookExecutions.filter(
      (hookInstance) =>
        // by ref is higher priority
        (ref && hookInstance.ref === ref) ||
        // otherwise we refine by name and eventually by id
        (name === hookInstance.name && (!id || (id && id === hookInstance.id))),
    )

    // remove destroyed instances from internal list
    this._hookExecutions = this._hookExecutions.filter(
      (instance) => !instances.includes(instance),
    )

    const destroyFns = instances.map(({ destroyFn }) => destroyFn())

    return combineLatest(destroyFns)
  }
}
