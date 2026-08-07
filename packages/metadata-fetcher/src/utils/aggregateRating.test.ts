import { describe, expect, it } from "vitest"
import { resolvedAggregateRating } from "./aggregateRating.ts"

describe("resolvedAggregateRating", () => {
  it("keeps a catalog's 0–5 mean and its count", () => {
    expect(resolvedAggregateRating(3.9574468, 47)).toEqual({
      value: 3.9574468,
      count: 47,
    })
    expect(resolvedAggregateRating(0, 3)).toEqual({ value: 0, count: 3 })
    expect(resolvedAggregateRating(5, 1)).toEqual({ value: 5, count: 1 })
  })

  it("states the mean alone when the source states no count", () => {
    expect(resolvedAggregateRating(4.5, undefined)).toEqual({ value: 4.5 })
  })

  it("states nothing from a count alone", () => {
    expect(resolvedAggregateRating(undefined, 47)).toBeUndefined()
  })

  it("drops a mean the 0–5 scale cannot hold", () => {
    expect(resolvedAggregateRating(8, 47)).toBeUndefined()
    expect(resolvedAggregateRating(-1, 47)).toBeUndefined()
  })

  it("drops a mean announced over zero ratings", () => {
    expect(resolvedAggregateRating(4.5, 0)).toBeUndefined()
  })

  it("drops a count that is not a whole number of ratings, keeping the mean", () => {
    expect(resolvedAggregateRating(4.5, 12.5)).toEqual({ value: 4.5 })
    expect(resolvedAggregateRating(4.5, -3)).toEqual({ value: 4.5 })
  })
})
