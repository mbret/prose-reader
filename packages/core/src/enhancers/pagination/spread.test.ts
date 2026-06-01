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
  describe(`ltr`, () => {
    it(`pairs a left page with its following right page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`left`),
          nextItem: createSpreadItem(`right`),
          previousItem: undefined,
          readingDirection: `ltr`,
        }),
      ).toBe(true)
    })

    it(`pairs a right page with its preceding left page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`right`),
          nextItem: undefined,
          previousItem: createSpreadItem(`left`),
          readingDirection: `ltr`,
        }),
      ).toBe(true)
    })

    it(`does not pair a left page with a preceding right page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`left`),
          nextItem: undefined,
          previousItem: createSpreadItem(`right`),
          readingDirection: `ltr`,
        }),
      ).toBe(false)
    })
  })

  describe(`rtl`, () => {
    it(`pairs a right page with its following left page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`right`),
          nextItem: createSpreadItem(`left`),
          previousItem: undefined,
          readingDirection: `rtl`,
        }),
      ).toBe(true)
    })

    it(`pairs a left page with its preceding right page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`left`),
          nextItem: undefined,
          previousItem: createSpreadItem(`right`),
          readingDirection: `rtl`,
        }),
      ).toBe(true)
    })

    it(`does not pair a lone leading left page with the next right page`, () => {
      expect(
        hasAdjacentSpreadPage({
          item: createSpreadItem(`left`),
          nextItem: createSpreadItem(`right`),
          previousItem: undefined,
          readingDirection: `rtl`,
        }),
      ).toBe(false)
    })
  })

  it(`ignores pages without a spread side`, () => {
    expect(
      hasAdjacentSpreadPage({
        item: createSpreadItem(),
        nextItem: createSpreadItem(`right`),
        previousItem: createSpreadItem(`left`),
        readingDirection: `ltr`,
      }),
    ).toBe(false)
  })

  it(`ignores a facing neighbor without an opposite spread side`, () => {
    expect(
      hasAdjacentSpreadPage({
        item: createSpreadItem(`left`),
        nextItem: createSpreadItem(),
        previousItem: undefined,
        readingDirection: `ltr`,
      }),
    ).toBe(false)
  })
})
