import { useMemo, useRef } from "react"

export const useMemoCompare = <T>(
  value: T,
  compare: (a: T, b: T) => boolean,
) => {
  const lastValue = useRef<{ value: T }>({ value })

  return useMemo(() => {
    if (compare(value, lastValue.current.value)) {
      return lastValue.current.value
    }

    lastValue.current = { value }

    return value
  }, [value, compare])
}
