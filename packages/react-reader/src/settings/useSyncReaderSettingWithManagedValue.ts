import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, filter, map } from "rxjs"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { getAppSettingValueInEffect } from "./appSettingValues"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "./managedSettings"

/**
 * How long a value has to stay before it is written into the reader, so a
 * slider dragged across values writes once.
 */
const WRITE_DELAY_MS = 200

/**
 * Keeps one of the reader's settings on the value in effect for this book: the
 * app's, from the setting's scope or the global values, or react-reader's own
 * when the app gives none.
 *
 * A value the reader takes that is not that one is reported to the app as
 * `"internal"` and adopted as react-reader's own, except, when the app gives a
 * value, the one the reader holds when react-reader meets it: the app's value
 * is about to replace it. Without an app value, react-reader adopts that one
 * too, which is how it starts from the value the reader was created with.
 */
export const useSyncReaderSettingWithManagedValue = <
  Name extends ManagedSettingName,
>(
  name: Name,
) => {
  const reader = useReader()
  const context = useReaderContext()
  const appSettingValues = useReaderContextValue([
    "settings",
    "settingsByScope",
    "settingsScopes",
    "uncontrolledSettings",
  ])
  const appValueInEffect = getAppSettingValueInEffect(appSettingValues, name)
  const valueInEffect =
    appValueInEffect ?? appSettingValues.uncontrolledSettings[name]
  const valueInEffectRef = useLiveRef(valueInEffect)
  const hasAppValueInEffectRef = useLiveRef(appValueInEffect !== undefined)

  useEffect(
    function writeValueInEffectIntoReader() {
      if (!reader || valueInEffect === undefined) return

      const timeout = setTimeout(function writeSettledValue() {
        const readerSettings: Partial<ManagedSettingValues> = {}

        readerSettings[name] = valueInEffect
        reader.settings.update(readerSettings)
      }, WRITE_DELAY_MS)

      return function cancelPendingWrite() {
        clearTimeout(timeout)
      }
    },
    [reader, name, valueInEffect],
  )

  const reportValuesTheReaderTakes = useCallback(
    function reportValuesTheReaderTakes() {
      return reader?.settings.values$
        .pipe(
          map((settings) => settings[name]),
          distinctUntilChanged(),
          filter(function isReaderValueToReport(readerValue, index) {
            const isValueReaderHeldWhenMet = index === 0
            const isAboutToBeReplacedByAppValue =
              isValueReaderHeldWhenMet && hasAppValueInEffectRef.current

            return (
              readerValue !== valueInEffectRef.current &&
              !isAboutToBeReplacedByAppValue
            )
          }),
        )
        .subscribe(function reportAndAdoptReaderValue(readerValue) {
          const changes: Partial<ManagedSettingValues> = {}

          changes[name] = readerValue
          context.value.onSettingsChange?.(changes, "internal")
          context.update((old) => ({
            ...old,
            uncontrolledSettings: { ...old.uncontrolledSettings, ...changes },
          }))
        })
    },
    [reader, name, context, valueInEffectRef, hasAppValueInEffectRef],
  )

  useSubscribe(reportValuesTheReaderTakes)
}
