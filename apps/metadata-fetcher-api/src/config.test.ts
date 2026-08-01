import { describe, expect, it } from "vitest"
import { configFromEnv } from "./config.ts"

describe("configFromEnv", () => {
  it("falls back to serviceable defaults on an empty environment", () => {
    const config = configFromEnv({})

    expect(config).toMatchObject({
      port: 3000,
      limit: 5,
      minScore: 0.5,
      requestTimeoutMs: 10_000,
    })
    expect(config.providers.map((provider) => provider.id)).toEqual([
      "openLibrary",
    ])
  })

  it("reads the overrides", () => {
    expect(
      configFromEnv({
        PORT: "8080",
        METADATA_LIMIT: "10",
        METADATA_MIN_SCORE: "0.8",
        REQUEST_TIMEOUT_MS: "2000",
      }),
    ).toMatchObject({
      port: 8080,
      limit: 10,
      minScore: 0.8,
      requestTimeoutMs: 2000,
    })
  })

  it("treats a blank variable as unset", () => {
    expect(configFromEnv({ PORT: "  " }).port).toBe(3000)
  })

  it("serves the playground everywhere but production", () => {
    expect(configFromEnv({}).playground).toBe(true)
    expect(configFromEnv({ NODE_ENV: "development" }).playground).toBe(true)
    expect(configFromEnv({ NODE_ENV: "test" }).playground).toBe(true)
    expect(configFromEnv({ NODE_ENV: "production" }).playground).toBe(false)
  })

  it("refuses to boot on a malformed variable", () => {
    expect(() => configFromEnv({ PORT: "80 80" })).toThrow(/Invalid PORT/)
    expect(() => configFromEnv({ PORT: "99999" })).toThrow(/Invalid PORT/)
    expect(() => configFromEnv({ METADATA_LIMIT: "2.5" })).toThrow(/an integer/)
    expect(() => configFromEnv({ METADATA_MIN_SCORE: "2" })).toThrow(
      /METADATA_MIN_SCORE/,
    )
  })
})
