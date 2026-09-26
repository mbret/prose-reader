import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, filter, map } from "rxjs"
import { useReader } from "../context/useReader"

type ReaderSettings = NonNullable<ReturnType<typeof useReader>>["settings"]

/**
 * How long a value has to stay before it is written into the reader, so a
 * slider dragged across values writes once.
 */
const WRITE_DELAY_MS = 200

/**
 * Keeps one of the reader's settings on the value react-reader holds for it:
 * the app's value when it passes one, react-reader's own copy otherwise.
 *
 * A value the reader takes that is not that one is reported to
 * `onReaderValueChange`, except, when the app passes its value, the one the
 * reader holds when react-reader meets it: the app's value is about to replace
 * it. With its own copy, react-reader reports that one too, which is how it
 * starts from the value the reader was created with.
 */
export const useSyncReaderSettingWithManagedValue = <Value>({
  appValue,
  uncontrolledValue,
  readReaderValue,
  toReaderSettings,
  onReaderValueChange,
}: {
  appValue: Value | undefined
  uncontrolledValue: Value
  readReaderValue: (settings: ReaderSettings["values"]) => Value
  toReaderSettings: (value: Value) => Parameters<ReaderSettings["update"]>[0]
  onReaderValueChange: (value: Value) => void
}) => {
  const reader = useReader()
  const managedValue = appValue ?? uncontrolledValue
  const managedValueRef = useLiveRef(managedValue)
  const isAppValueRef = useLiveRef(appValue !== undefined)
  const readReaderValueRef = useLiveRef(readReaderValue)
  const toReaderSettingsRef = useLiveRef(toReaderSettings)
  const onReaderValueChangeRef = useLiveRef(onReaderValueChange)

  useEffect(
    function writeManagedValueIntoReader() {
      if (!reader) return

      const timeout = setTimeout(function writeSettledValue() {
        reader.settings.update(toReaderSettingsRef.current(managedValue))
      }, WRITE_DELAY_MS)

      return function cancelPendingWrite() {
        clearTimeout(timeout)
      }
    },
    [reader, managedValue, toReaderSettingsRef],
  )

  const reportValuesTheReaderTakes = useCallback(
    function reportValuesTheReaderTakes() {
      return reader?.settings.values$
        .pipe(
          map((settings) => readReaderValueRef.current(settings)),
          distinctUntilChanged(),
          filter(function isReaderValueToReport(readerValue, index) {
            const isValueReaderHeldWhenMet = index === 0
            const isAboutToBeReplacedByAppValue =
              isValueReaderHeldWhenMet && isAppValueRef.current

            return (
              readerValue !== managedValueRef.current &&
              !isAboutToBeReplacedByAppValue
            )
          }),
        )
        .subscribe(function reportReaderValue(readerValue) {
          onReaderValueChangeRef.current(readerValue)
        })
    },
    [
      reader,
      readReaderValueRef,
      managedValueRef,
      isAppValueRef,
      onReaderValueChangeRef,
    ],
  )

  useSubscribe(reportValuesTheReaderTakes)
}
