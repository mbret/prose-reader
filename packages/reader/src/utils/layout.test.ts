import { getNewScaledOffset } from "./layout"

describe(`getNewScaledOffset`, () => {
  test.each([
    // same scale
    [1, 1, 600, 600, 0, 0],
    [2, 2, 600, 600 * 2, 0, 0],
    [2, 2, 600, 600 * 2, 300, 300],
    // increase
    [1, 2, 600, 1200 * 2, 0, 300],
    [1, 3, 600, 600 * 3, 0, 600],
    [2, 3, 600, 600 * 3, 300, 600],
    [2, 3, 600, 600 * 3, 310, 615],
    [1, 2, 100, 1000, 0, 50],
    [1, 3, 100, 1000, 0, 100],
    [2, 3, 100, 1000, 50, 100],
    [3, 1, 600, 600 * 3, 0, 0],
    [1, 3, 969, 13442, 6541, 20592],
    // decrease
    [3, 2, 600, 600 * 2, 615, 310],
    [3, 1, 969, 13442, 20592, 6541],
    // dangerous out of bound values
    [3, 1, 600, 600 * 3, 0, 0]
  ])(
    `From %i to %i, screen of %i, page of %i, scroll at %i, it should returns new scroll of %i`,
    (oldScale, newScale, screenWidth, pageWidth, viewportScrollLeft, value) => {
      expect(getNewScaledOffset({ oldScale, newScale, screenSize: screenWidth, pageSize: pageWidth, scrollOffset: viewportScrollLeft })).toBe(value)
    }
  )
})
