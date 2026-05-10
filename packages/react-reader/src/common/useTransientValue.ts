import { useEffect, useState } from "react"

export const useTransientValue = <Value>(
  value: Value | undefined,
  durationMs: number,
) => {
  const [transientValue, setTransientValue] = useState<Value | undefined>()

  useEffect(() => {
    if (value === undefined) {
      setTransientValue(undefined)

      return
    }

    setTransientValue(value)

    const timeoutId = window.setTimeout(() => {
      setTransientValue((currentValue) =>
        Object.is(currentValue, value) ? undefined : currentValue,
      )
    }, durationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [durationMs, value])

  return transientValue
}
