import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, filter, map } from "rxjs"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { getAppSettingValueInEffect } from "./appSettingValues"
import type { ManagedSettingName, ReactReaderSettings } from "./managedSettings"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * Keeps one of the reader's settings on the value in effect for this book: the
 * app's, from the setting's scope or the global values, or react-reader's own
 * when the app gives none.
 *
 * The value the reader holds when react-reader meets it is not a change, and is
 * not reported: the value in effect replaces it, or, without one, react-reader
 * adopts it as its own, which is how it starts from the value the reader was
 * created with. A value the reader takes after that and that is not the value
 * in effect, such as one set outside react-reader with
 * `reader.settings.update()`, is reported to the app as `"internal"` and
 * adopted as react-reader's own.
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
  const screen = useScreenSettingsScopeReference()
  const appValueInEffect = getAppSettingValueInEffect(
    appSettingValues,
    name,
    screen,
  )
  const valueInEffect =
    appValueInEffect ?? appSettingValues.uncontrolledSettings[name]
  const valueInEffectRef = useLiveRef(valueInEffect)

  useEffect(
    function writeValueInEffectIntoReader() {
      if (
        !reader ||
        valueInEffect === undefined ||
        reader.settings.values[name] === valueInEffect
      ) {
        return
      }

      const readerSettings: ReactReaderSettings = {}

      readerSettings[name] = valueInEffect
      reader.settings.update(readerSettings)
    },
    [reader, name, valueInEffect],
  )

  const adoptValuesTheReaderTakes = useCallback(
    function adoptValuesTheReaderTakes() {
      return reader?.settings.values$
        .pipe(
          map((settings) => settings[name]),
          distinctUntilChanged(),
          map(function toReaderValueTaken(readerValue, index) {
            return { readerValue, isValueReaderHeldWhenMet: index === 0 }
          }),
          filter(function isReaderValueToAdopt({
            readerValue,
            isValueReaderHeldWhenMet,
          }) {
            const isValueInEffect = readerValue === valueInEffectRef.current
            const hasValueInEffect = valueInEffectRef.current !== undefined
            const isReplacedByValueInEffect =
              isValueReaderHeldWhenMet && hasValueInEffect

            return !isValueInEffect && !isReplacedByValueInEffect
          }),
        )
        .subscribe(function adoptReaderValue({
          readerValue,
          isValueReaderHeldWhenMet,
        }) {
          const changes: ReactReaderSettings = {}

          changes[name] = readerValue

          if (!isValueReaderHeldWhenMet) {
            context.value.onSettingsChange?.(changes, "internal")
          }

          context.update((old) => ({
            ...old,
            uncontrolledSettings: { ...old.uncontrolledSettings, ...changes },
          }))
        })
    },
    [reader, name, context, valueInEffectRef],
  )

  useSubscribe(adoptValuesTheReaderTakes)
}
