import React, { useCallback, useEffect } from "react"
import RcSlider from "rc-slider"
import "rc-slider/assets/index.css"
import { useIsComics, usePagination } from "../states"
import { useReader } from "../useReader"
import { useObserve, useSignal, useSubscribe } from "reactjrx"

export const Scrubber = () => {
  const { reader } = useReader()
  const isComic = useIsComics()
  const pagination = usePagination()
  const { manifest } = useObserve(() => reader?.context.state$, []) ?? {}
  const isUsingSpread = pagination?.isUsingSpread
  const currentRealPage = isComic ? pagination?.endAbsolutePageIndex : pagination?.endPageIndexInSpineItem
  const currentPage = isUsingSpread ? Math.floor((currentRealPage || 0) / 2) : currentRealPage
  const totalApproximatePages = (isComic ? pagination?.numberOfTotalPages : pagination?.beginNumberOfPagesInSpineItem || 1) || 0
  const [value, valueSignal] = useSignal({
    default: currentPage || 0
  })
  const max = (isUsingSpread ? totalApproximatePages / 2 : totalApproximatePages) - 1
  const step = 1

  useEffect(() => {
    valueSignal.setValue(currentPage || 0)
  }, [currentPage])

  const reverse = manifest?.readingDirection === "rtl"

  // @todo check bug when several pages are turned after resize

  const onChange = useCallback(
    (value: number | number[]) => {
      if (typeof value === "number") {
        valueSignal.setValue(value)

        const pageIndex = isUsingSpread ? Math.floor(value) * 2 : Math.floor(value)

        if (isComic) {
          reader?.navigation.goToSpineItem(pageIndex)
        } else {
          reader?.navigation.goToPageOfSpineItem(pageIndex, pagination?.beginSpineItemIndex ?? 0)
        }
      }
    },
    [reader, isUsingSpread]
  )

  /**
   * @note
   * Scrubber can navigate fast and without lock we may end up with
   * slowness due to the reader
   * paginating and loading items in between.
   * This is good practice (but not required) to throttle it.
   */
  useSubscribe(() => reader?.navigation.throttleLock({ duration: 100, trigger: valueSignal.subject }), [reader])

  if (totalApproximatePages === 1 || (isUsingSpread && totalApproximatePages === 2)) {
    return null
  }

  return <RcSlider value={value} max={max} min={0} onChange={onChange} reverse={reverse} step={step} keyboard={false} />
}
