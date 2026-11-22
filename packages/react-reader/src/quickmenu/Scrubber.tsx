import { Box } from "@chakra-ui/react"
import { type ComponentProps, useCallback, useEffect } from "react"
import { signal, useObserve, useSignalState, useSubscribe } from "reactjrx"
import { useReader } from "../context/useReader.ts"
import { useNavigationContext } from "../navigation/useNavigationContext.ts"
import { usePagination } from "../pagination/usePagination.ts"
import { ThemedSlider } from "./ThemedSlider.tsx"

/**
 * The slider's values are the pages `useNavigationContext` counts, one value
 * per spread when the reader shows spreads.
 */
const useSliderValues = () => {
  const pagination = usePagination()
  const {
    beginPageIndex,
    totalApproximatePages = 0,
    goToPageIndex,
  } = useNavigationContext()
  const numberOfPagesPerSliderValue = pagination?.isUsingSpread ? 2 : 1
  const currentSliderValue = Math.floor(
    beginPageIndex / numberOfPagesPerSliderValue,
  )
  const [value, valueSignal] = useSignalState(() =>
    signal({
      default: currentSliderValue,
    }),
  )
  const min = 0
  const max = Math.max(
    0,
    Math.ceil(totalApproximatePages / numberOfPagesPerSliderValue) - 1,
  )

  useEffect(() => {
    valueSignal.update(currentSliderValue)
  }, [currentSliderValue, valueSignal])

  const goToSliderValue = (sliderValue: number) => {
    valueSignal.update(sliderValue)

    goToPageIndex({
      pageIndex: Math.floor(sliderValue) * numberOfPagesPerSliderValue,
      animation: false,
    })
  }

  return {
    value,
    valueSignal,
    min,
    max,
    goToSliderValue,
  }
}

export const Scrubber = (props: ComponentProps<typeof ThemedSlider>) => {
  const reader = useReader()
  const { data: { manifest } = {} } =
    useObserve(() => reader?.context, [reader]) ?? {}
  const reverse = manifest?.readingDirection === "rtl"
  const { value, valueSignal, min, max, goToSliderValue } = useSliderValues()

  const onChange: NonNullable<ComponentProps<typeof ThemedSlider>["onChange"]> =
    function goToSliderValueOfChange(values) {
      const [value = 0] = Array.isArray(values) ? values : [values]

      goToSliderValue(value)
    }

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

  const hasOneSliderValueOnly = max === 0

  if (hasOneSliderValueOnly) return <Box style={props.style} />

  return (
    <ThemedSlider
      value={[value]}
      max={max}
      min={min}
      reverse={reverse}
      step={1}
      onChange={onChange}
      {...props}
    />
  )
}
