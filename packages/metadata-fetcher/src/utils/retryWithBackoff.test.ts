import { afterEach, describe, expect, it, vi } from "vitest"
import { retryWithBackoff } from "./retryWithBackoff.ts"

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("retryWithBackoff", () => {
  it("returns after retrying with exponential delays", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    const operation = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValue("done")
    const pending = retryWithBackoff(operation, {
      attempts: 3,
      initialDelayMs: 100,
      shouldRetry: () => true,
    })

    await vi.advanceTimersByTimeAsync(99)
    expect(operation).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(operation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(199)
    expect(operation).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toBe("done")
    expect(operation.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2, 3])
  })

  it("does not retry an error rejected by the predicate", async () => {
    const failure = new Error("do not retry")
    const operation = vi.fn<() => Promise<never>>().mockRejectedValue(failure)

    await expect(
      retryWithBackoff(operation, {
        attempts: 3,
        initialDelayMs: 100,
        shouldRetry: () => false,
      }),
    ).rejects.toBe(failure)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("rethrows the last error after the requested total attempts", async () => {
    vi.useFakeTimers()
    const failures = [
      new Error("first"),
      new Error("second"),
      new Error("last"),
    ]
    const operation = vi
      .fn<() => Promise<never>>()
      .mockRejectedValueOnce(failures[0])
      .mockRejectedValueOnce(failures[1])
      .mockRejectedValueOnce(failures[2])
    const pending = retryWithBackoff(operation, {
      attempts: 3,
      initialDelayMs: 100,
      jitter: false,
      shouldRetry: () => true,
    })
    const rejected = expect(pending).rejects.toBe(failures[2])

    await vi.runAllTimersAsync()
    await rejected
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it("stops an in-progress backoff when aborted", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const abort = new Error("cancelled")
    const operation = vi
      .fn<() => Promise<never>>()
      .mockRejectedValue(new Error())
    const pending = retryWithBackoff(operation, {
      attempts: 3,
      initialDelayMs: 1_000,
      shouldRetry: () => true,
      signal: controller.signal,
    })
    const rejected = expect(pending).rejects.toBe(abort)

    await vi.advanceTimersByTimeAsync(0)
    controller.abort(abort)

    await rejected
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("validates its attempt and delay bounds", async () => {
    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    await expect(
      retryWithBackoff(operation, {
        attempts: 0,
        initialDelayMs: 100,
        shouldRetry: () => true,
      }),
    ).rejects.toThrow("attempts")
    await expect(
      retryWithBackoff(operation, {
        attempts: 1,
        initialDelayMs: Number.POSITIVE_INFINITY,
        shouldRetry: () => true,
      }),
    ).rejects.toThrow("initialDelayMs")
    expect(operation).not.toHaveBeenCalled()
  })
})
