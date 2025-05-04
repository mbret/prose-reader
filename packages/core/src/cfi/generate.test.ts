import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { generateRootCfi } from "./generate"

describe("generateRootCfi", () => {
  it("should generate a root cfi", () => {
    const cfi = generateRootCfi({
      id: "item1",
      href: "item1.html",
      index: 1,
    } as unknown as Manifest["spineItems"][number])

    expect(cfi).toBe("epubcfi(/0[;vnd.prose.anchor=1])")
  })
})
