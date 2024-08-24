/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { Streamer } from "."

describe("Given custom error on get Archive", () => {
  it("should return correct error", async () => {
    class MyError extends Error {}

    const streamer = new Streamer({
      cleanArchiveAfter: 1,
      getArchive: async () => {
        throw new MyError()
      },
      onError: (error) => {
        if (error instanceof MyError)
          return new Response(`myError`, { status: 500 })

        return new Response(``, { status: 500 })
      },
    })

    const response = await streamer.fetchManifest({ key: "any" })

    expect(await response.text()).toBe(`myError`)
    expect(response.status).toBe(500)
  })
})
