import { firstValueFrom, Subject, takeUntil } from "rxjs"
import { describe, expect, it } from "vitest"
import { HookManager } from "./HookManager"
import type { AsyncHookParams } from "./types"

type TestHook =
  | {
      name: "value.event"
      runFn: (params: { value: string }) => string
    }
  | {
      name: "value.async"
      runFn: (params: AsyncHookParams & { value: string }) => Promise<string>
    }
  | {
      name: "value.pipeline"
      runFn: (params: { suffix: string; value: string }) => string | undefined
    }

const transformValue = (
  hookManager: HookManager<TestHook>,
  initialValue: string,
) =>
  hookManager.executeSequential(
    "value.pipeline",
    { suffix: "!", value: initialValue },
    (params, nextValue) => ({
      ...params,
      value: nextValue ?? params.value,
    }),
  ).finalParams.value

describe("HookManager", () => {
  it("executes hooks without lifecycle execution tracking", () => {
    const hookManager = new HookManager<TestHook>()

    hookManager.register("value.event", ({ value }) => value.toUpperCase())

    expect(hookManager.execute("value.event", { value: "a" })).toEqual(["A"])
    expect(hookManager._hookExecutions).toHaveLength(0)
  })

  it("removes async hook tracking after completion", async () => {
    const hookManager = new HookManager<TestHook>()

    hookManager.register("value.async", async ({ value }) =>
      value.toUpperCase(),
    )

    expect(
      await hookManager.executeAsync("value.async", "item", { value: "a" }),
    ).toEqual(["A"])
    expect(hookManager._hookExecutions).toHaveLength(0)
  })

  it("aborts async hook executions by id", async () => {
    const hookManager = new HookManager<TestHook>()
    let resolveHook: ((value: string) => void) | undefined
    let signal: AbortSignal | undefined

    hookManager.register(
      "value.async",
      ({ signal: hookSignal }) =>
        new Promise<string>((resolve) => {
          resolveHook = resolve
          signal = hookSignal
        }),
    )

    const result = hookManager.executeAsync("value.async", "item", {
      value: "a",
    })
    await Promise.resolve()

    expect(hookManager._hookExecutions).toHaveLength(1)
    expect(signal?.aborted).toBe(false)

    hookManager.destroy("value.async", "item")

    expect(signal?.aborted).toBe(true)
    expect(hookManager._hookExecutions).toHaveLength(0)

    resolveHook?.("A")

    await expect(result).resolves.toEqual(["A"])
  })

  it("executes sequential hooks in registration order without lifecycle executions", () => {
    const hookManager = new HookManager<TestHook>()

    hookManager.register("value.pipeline", ({ suffix, value }) => {
      return `${value}${suffix}`
    })
    hookManager.register("value.pipeline", () => undefined)
    hookManager.register("value.pipeline", ({ value }) => value.toUpperCase())

    expect(transformValue(hookManager, "a")).toBe("A!")
    expect(hookManager._hookExecutions).toHaveLength(0)
  })

  it("aborts in-flight executions when the parent signal aborts", async () => {
    const hookManager = new HookManager<TestHook>()
    let resolveHook: ((value: string) => void) | undefined
    let signal: AbortSignal | undefined

    hookManager.register(
      "value.async",
      ({ signal: hookSignal }) =>
        new Promise<string>((resolve) => {
          resolveHook = resolve
          signal = hookSignal
        }),
    )

    const parentController = new AbortController()
    const result = hookManager.executeAsync(
      "value.async",
      "item",
      { value: "a" },
      parentController.signal,
    )

    await Promise.resolve()

    expect(hookManager._hookExecutions).toHaveLength(1)
    expect(signal?.aborted).toBe(false)

    parentController.abort()

    expect(signal?.aborted).toBe(true)
    expect(hookManager._hookExecutions).toHaveLength(0)

    resolveHook?.("A")

    await expect(result).resolves.toEqual(["A"])
  })

  it("does not abort the parent signal listener after natural completion", async () => {
    const hookManager = new HookManager<TestHook>()
    let signal: AbortSignal | undefined

    hookManager.register("value.async", async ({ signal: hookSignal }) => {
      signal = hookSignal
      return "A"
    })

    const parentController = new AbortController()

    await hookManager.executeAsync(
      "value.async",
      "item",
      { value: "a" },
      parentController.signal,
    )

    expect(signal?.aborted).toBe(false)

    parentController.abort()

    expect(signal?.aborted).toBe(false)
  })

  it("aborts in-flight executions when fromExecuteAsync is unsubscribed", async () => {
    const hookManager = new HookManager<TestHook>()
    let resolveHook: ((value: string) => void) | undefined
    let signal: AbortSignal | undefined

    hookManager.register(
      "value.async",
      ({ signal: hookSignal }) =>
        new Promise<string>((resolve) => {
          resolveHook = resolve
          signal = hookSignal
        }),
    )

    const stop$ = new Subject<void>()
    const result = firstValueFrom(
      hookManager
        .fromExecuteAsync("value.async", "item", { value: "a" })
        .pipe(takeUntil(stop$)),
      { defaultValue: undefined },
    )

    await Promise.resolve()

    expect(hookManager._hookExecutions).toHaveLength(1)
    expect(signal?.aborted).toBe(false)

    stop$.next()

    expect(signal?.aborted).toBe(true)
    expect(hookManager._hookExecutions).toHaveLength(0)

    resolveHook?.("A")

    await expect(result).resolves.toBeUndefined()
  })

  it("does not abort fromExecuteAsync on natural completion", async () => {
    const hookManager = new HookManager<TestHook>()
    let signal: AbortSignal | undefined

    hookManager.register("value.async", async ({ signal: hookSignal }) => {
      signal = hookSignal
      return "A"
    })

    const values = await firstValueFrom(
      hookManager.fromExecuteAsync("value.async", "item", { value: "a" }),
    )

    expect(values).toEqual(["A"])
    expect(signal?.aborted).toBe(false)
    expect(hookManager._hookExecutions).toHaveLength(0)
  })

  it("deregisters sequential hooks", () => {
    const hookManager = new HookManager<TestHook>()
    const unregister = hookManager.register(
      "value.pipeline",
      ({ suffix, value }) => `${value}${suffix}`,
    )

    expect(transformValue(hookManager, "a")).toBe("a!")

    unregister()

    expect(transformValue(hookManager, "a")).toBe("a")
  })
})
