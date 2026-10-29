import { describe, expect, it } from "vitest"
import {
  MetadataProviderResponseError,
  parseRetryAfterHeader,
  responseErrorRetryAfterMs,
} from "./responseError.ts"

describe("parseRetryAfterHeader", () => {
  const now = Date.parse("2026-10-23T12:00:00Z")

  it("reads a number of seconds", () => {
    expect(parseRetryAfterHeader("120", now)).toBe(120_000)
    expect(parseRetryAfterHeader(" 0 ", now)).toBe(0)
  })

  it("reads an HTTP date as the time left until it", () => {
    expect(parseRetryAfterHeader("Fri, 23 Oct 2026 12:00:30 GMT", now)).toBe(
      30_000,
    )
    expect(parseRetryAfterHeader("Fri, 23 Oct 2026 11:00:00 GMT", now)).toBe(0)
  })

  it("ignores an absent or unreadable header", () => {
    expect(parseRetryAfterHeader(null, now)).toBeUndefined()
    expect(parseRetryAfterHeader("", now)).toBeUndefined()
    expect(parseRetryAfterHeader("-5", now)).toBeUndefined()
    expect(parseRetryAfterHeader("soon", now)).toBeUndefined()
  })
})

describe("responseErrorRetryAfterMs", () => {
  it("reads the delay a response error carries", () => {
    expect(
      responseErrorRetryAfterMs(
        new MetadataProviderResponseError(429, "slow down", {
          retryAfterMs: 2_000,
        }),
      ),
    ).toBe(2_000)
    expect(
      responseErrorRetryAfterMs(new MetadataProviderResponseError(429)),
    ).toBeUndefined()
  })

  it("ignores a value that is not a delay", () => {
    expect(responseErrorRetryAfterMs({ retryAfterMs: -1 })).toBeUndefined()
    expect(responseErrorRetryAfterMs({ retryAfterMs: "2" })).toBeUndefined()
    expect(responseErrorRetryAfterMs(undefined)).toBeUndefined()
  })
})
