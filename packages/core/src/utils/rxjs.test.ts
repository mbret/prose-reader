import { firstValueFrom, map, Subject, share, timeout } from "rxjs"
import { describe, expect, it } from "vitest"
import { recordUnhandledErrors } from "../tests/utils"
import { deferNextResult } from "./rxjs"

/**
 * A stream that, as an item's layout does, runs on each value a subject
 * receives, and fails for `"fail"`. It is shared, so a subscription after it
 * failed starts it again rather than gets its error.
 */
const createSharedStream = () => {
  const trigger = new Subject<string>()
  const failure = new Error("the stream failed")
  const stream = trigger.pipe(
    map((value) => {
      if (value === "fail") throw failure

      return value
    }),
    share(),
  )

  return { failure, stream, trigger }
}

describe("deferNextResult", () => {
  it("gives the value the stream gave since it was called", async () => {
    const { stream, trigger } = createSharedStream()
    const nextResult = deferNextResult(stream)

    trigger.next("a")

    await expect(firstValueFrom(nextResult())).resolves.toBe("a")
  })

  it("gives the error the stream gave since it was called", async () => {
    const unhandledErrors = recordUnhandledErrors()
    const { failure, stream, trigger } = createSharedStream()
    const nextResult = deferNextResult(stream)

    trigger.next("fail")

    await expect(firstValueFrom(nextResult().pipe(timeout(100)))).rejects.toBe(
      failure,
    )
    expect(unhandledErrors).toEqual([])
  })

  it("gives the stream itself when it gave nothing yet", async () => {
    const { stream, trigger } = createSharedStream()
    const nextResult = firstValueFrom(deferNextResult(stream)())

    trigger.next("a")

    await expect(nextResult).resolves.toBe("a")
  })
})
