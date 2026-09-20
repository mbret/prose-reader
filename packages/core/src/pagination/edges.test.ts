import { isShallowEqual } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { createEmptyPaginationEdge, isSamePaginationResult } from "./edges"

const buildResult = () => ({
  begin: { ...createEmptyPaginationEdge(), spineItemIndex: 0 },
  end: { ...createEmptyPaginationEdge(), spineItemIndex: 1 },
  numberOfTotalPages: 2,
})

describe("isSamePaginationResult", () => {
  it("considers two results built from the same values the same", () => {
    /**
     * This is the whole reason the helper exists: a result is rebuilt from
     * scratch every time, so a shallow comparison of the result itself only
     * ever sees two brand new edge objects.
     */
    expect(isShallowEqual(buildResult(), buildResult())).toBe(false)
    expect(isSamePaginationResult(buildResult(), buildResult())).toBe(true)
  })

  it("tells two results apart on an edge value", () => {
    expect(
      isSamePaginationResult(buildResult(), {
        ...buildResult(),
        end: { ...createEmptyPaginationEdge(), spineItemIndex: 2 },
      }),
    ).toBe(false)
  })

  it("tells two results apart on what they carry besides their edges", () => {
    expect(
      isSamePaginationResult(buildResult(), {
        ...buildResult(),
        numberOfTotalPages: 3,
      }),
    ).toBe(false)
  })
})
