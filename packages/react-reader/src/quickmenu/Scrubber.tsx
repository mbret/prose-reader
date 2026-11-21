import { Box } from "@chakra-ui/react"
import { type ComponentProps, useCallback, useEffect } from "react"
import { signal, useObserve, useSignalState, useSubscribe } from "reactjrx"
import { useReader } from "../context/useReader.ts"
import { useNavigationContext } from "../navigation/useNavigationContext.ts"
import { usePagination } from "../pagination/usePagination.ts"
import { ThemedSlider } from "./ThemedSlider.tsx"

const useSliderValues = () => {
  const pagination = usePagination()
  const isUsingSpread = pagination?.isUsingSpread
  const { beginPageIndex: currentRealPage, totalApproximatePages = 0 } =
    useNavigationContext()
  const currentPage = isUsingSpread
    ? Math.floor((currentRealPage || 0) / 2)
    : currentRealPage
  const [value, valueSignal] = useSignalState(() =>
    signal({
      default: currentPage || 0,
    }),
  )
  const min = 0
  const max = Math.max(
    0,
    isUsingSpread
      ? Math.floor((totalApproximatePages - 1) / 2)
      : totalApproximatePages - 1,
  )

  useEffect(() => {
    valueSignal.update(currentPage || 0)
  }, [currentPage, valueSignal])

  return {
    value,
    valueSignal,
    min,
    max,
  }
}

export const Scrubber = (props: ComponentProps<typeof ThemedSlider>) => {
  const reader = useReader()
  const pagination = usePagination()
  const { data: { manifest } = {} } =
    useObserve(() => reader?.context, [reader]) ?? {}
  const reverse = manifest?.readingDirection === "rtl"
  const isUsingSpread = pagination?.isUsingSpread
  const isScrubbingPagesOfChapter = pagination?.hasChapters ?? false
  const { totalApproximatePages = 0 } = useNavigationContext()
  const step = 1
  const { value, valueSignal, min, max } = useSliderValues()

  const onChange: NonNullable<ComponentProps<typeof ThemedSlider>["onChange"]> =
    useCallback(
      (values) => {
        const [value = 0] = Array.isArray(values) ? values : [values]

        valueSignal.update(value)

        const pageIndex = isUsingSpread
          ? Math.floor(value) * 2
          : Math.floor(value)

        if (isScrubbingPagesOfChapter) {
          reader?.navigation.goToPageOfSpineItem({
            pageIndex,
            spineItemId: reader.pagination.state.begin.spineItemIndex ?? 0,
            animation: false,
          })
        } else {
          reader?.navigation.goToAbsolutePageIndex({
            absolutePageIndex: pageIndex,
            animation: false,
          })
        }
      },
      [reader, isUsingSpread, valueSignal, isScrubbingPagesOfChapter],
    )

  /**
   * @note
   * Scrubber can navigate fast and without lock we may end up with
   * slowness due to the reader
   * paginating and loading items in between.
   * This is good practice (but not required) to throttle it.
   */
  const throttleLock = useCallback(() => {
    return reader?.navigation.throttleLock({
      duration: 100,
      trigger: valueSignal,
    })
  }, [reader, valueSignal])

  useSubscribe(throttleLock)

  const disabled =
    totalApproximatePages === 1 ||
    (isUsingSpread && totalApproximatePages === 2)

  if (disabled) return <Box style={props.style} />

  return (
    <ThemedSlider
      value={[value]}
      max={max}
      min={min}
      reverse={reverse}
      step={step}
      onChange={onChange}
      {...props}
    />
  )
}
