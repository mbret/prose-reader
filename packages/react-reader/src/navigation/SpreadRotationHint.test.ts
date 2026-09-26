/* @vitest-environment happy-dom */

import { describe, expect, it } from "vitest"
import { getSpreadRotationHintTargetKey } from "./SpreadRotationHint"

const createPagination = (index: number) => ({
  beginPageIndexInSpineItem: 0,
  beginSpineItemIndex: index,
  endPageIndexInSpineItem: 0,
  endSpineItemIndex: index,
})

describe(`SpreadRotationHint`, () => {
  it(`returns a target key only when the current page is a panorama half that can become a spread after rotation`, () => {
    const hint: Parameters<typeof getSpreadRotationHintTargetKey>[0] = {
      pagination: createPagination(0),
      isSpread: false,
      viewportState: `free`,
      wouldSpreadWhenRotated: true,
      isPanorama: true,
    }

    expect(getSpreadRotationHintTargetKey(hint)).toBe(`0:0:0:0`)
    expect(
      getSpreadRotationHintTargetKey({ ...hint, isSpread: true }),
    ).toBeUndefined()
    expect(
      getSpreadRotationHintTargetKey({
        ...hint,
        wouldSpreadWhenRotated: false,
      }),
    ).toBeUndefined()
    expect(
      getSpreadRotationHintTargetKey({ ...hint, isPanorama: false }),
    ).toBeUndefined()
    expect(
      getSpreadRotationHintTargetKey({ ...hint, viewportState: `busy` }),
    ).toBeUndefined()
  })
})
