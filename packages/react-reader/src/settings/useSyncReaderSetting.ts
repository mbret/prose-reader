import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, map } from "rxjs"
import { useReader } from "../context/useReader"

type ReaderSettings = NonNullable<ReturnType<typeof useReader>>["settings"]

/**
 * How long a value has to stay before it is written into the reader, so a
 * slider dragged across values writes once.
 */
const WRITE_DELAY_MS = 200

/**
 * Keeps one of the reader's settings on the value react-reader holds for it:
 * the app's prop when it passes one, react-reader's own copy otherwise. A
 * value the reader takes that is not that one, such as the value the reader
 * was created with or one set on the reader directly, is reported to
 * `onReaderValueChange`.
 */
export const useSyncReaderSetting = <Value>({
  value,
  readReaderValue,
  toReaderSettings,
  onReaderValueChange,
}: {
  value: Value
  readReaderValue: (settings: ReaderSettings["values"]) => Value
  toReaderSettings: (value: Value) => Parameters<ReaderSettings["update"]>[0]
  onReaderValueChange: (value: Value) => void
}) => {
  const reader = useReader()
  const valueRef = useLiveRef(value)
  const readReaderValueRef = useLiveRef(readReaderValue)
  const toReaderSettingsRef = useLiveRef(toReaderSettings)
  const onReaderValueChangeRef = useLiveRef(onReaderValueChange)

  useEffect(
    function writeValueIntoReader() {
      if (!reader) return

      const timeout = setTimeout(function writeSettledValue() {
        reader.settings.update(toReaderSettingsRef.current(value))
      }, WRITE_DELAY_MS)

      return function cancelPendingWrite() {
        clearTimeout(timeout)
      }
    },
    [reader, value, toReaderSettingsRef],
  )

  const reportValuesTheReaderTakes = useCallback(
    function reportValuesTheReaderTakes() {
      return reader?.settings.values$
        .pipe(
          map((settings) => readReaderValueRef.current(settings)),
          distinctUntilChanged(),
        )
        .subscribe(function reportValueNotHeld(readerValue) {
          if (readerValue !== valueRef.current) {
            onReaderValueChangeRef.current(readerValue)
          }
        })
    },
    [reader, readReaderValueRef, valueRef, onReaderValueChangeRef],
  )

  useSubscribe(reportValuesTheReaderTakes)
}
