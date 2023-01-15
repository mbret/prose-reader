import React, { useCallback, useEffect, useState } from "react"
import RcSlider from "rc-slider"
import "rc-slider/assets/index.css"
import { useRecoilValue } from "recoil"
import { isComicState, paginationState, manifestState } from "./state"
import { useReaderValue } from "./useReader"

export const Scrubber = () => {
  const reader = useReaderValue()
  const isComic = useRecoilValue(isComicState)
  const pagination = useRecoilValue(paginationState)
  const manifest = useRecoilValue(manifestState)
  const isUsingSpread = pagination?.isUsingSpread
  const currentRealPage = isComic ? pagination?.endAbsolutePageIndex : pagination?.endPageIndexInChapter
  const currentPage = isUsingSpread ? Math.floor((currentRealPage || 0) / 2) : currentRealPage
  const totalApproximatePages = (isComic ? pagination?.numberOfTotalPages : pagination?.beginNumberOfPagesInChapter || 1) || 0
  const [value, setValue] = useState(currentPage || 0)
  const max = (isUsingSpread ? totalApproximatePages / 2 : totalApproximatePages) - 1
  const step = 1

  useEffect(() => {
    setValue(currentPage || 0)
  }, [currentPage])

  const reverse = manifest?.readingDirection === "rtl"

  // @todo check bug when several pages are turned after resize

  const onChange = useCallback(
    (value: number | number[]) => {
      if (typeof value === "number") {
        setValue(value)

        const pageIndex = isUsingSpread ? Math.floor(value) * 2 : Math.floor(value)

        if (isComic) {
          reader?.goToSpineItem(pageIndex)
        } else {
          reader?.goToPageOfCurrentChapter(pageIndex)
        }
      }
    },
    [setValue, reader, isUsingSpread]
  )

  if (totalApproximatePages === 1 || (isUsingSpread && totalApproximatePages === 2)) {
    return null
  }

  return <RcSlider value={value} max={max} min={0} onChange={onChange} reverse={reverse} step={step} />
}
