import { describe, expect, it } from "vitest"
import { hasAdjacentSpreadPage } from "./spread"

type SpreadItem = NonNullable<
  Parameters<typeof hasAdjacentSpreadPage>[0]["item"]
>

const createSpreadItem = (spreadSide?: `left` | `right`): SpreadItem => ({
  item: {
    pageSpreadLeft: spreadSide === `left` ? true : undefined,
    pageSpreadRight: spreadSide === `right` ? true : undefined,
  },
})

describe(`hasAdjacentSpreadPage`, () => {
  it(`detects a visible left page with an adjacent right page`, () => {
    expect(
      hasAdjacentSpreadPage({
        item: createSpreadItem(`left`),
        nextItem: createSpreadItem(`right`),
        previousItem: undefined,
      }),
    ).toBe(true)
  })

  it(`detects the reverse page-spread order`, () => {
    expect(
      hasAdjacentSpreadPage({
        item: createSpreadItem(`left`),
        nextItem: undefined,
        previousItem: createSpreadItem(`right`),
      }),
    ).toBe(true)
  })

  it(`ignores pages without an adjacent opposite spread side`, () => {
    expect(
      hasAdjacentSpreadPage({
        item: createSpreadItem(`left`),
        nextItem: createSpreadItem(),
        previousItem: undefined,
      }),
    ).toBe(false)
  })
})
