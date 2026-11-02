import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, filter, map, tap } from "rxjs"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import type { ManagedSettingName, ReactReaderSettings } from "./managedSettings"
import {
  changeManagedSettingValue,
  getManagedSettingValuesForScope,
  getSettingScopeReferenceInEffect,
  MANAGED_SETTING_SOURCE_KEYS,
} from "./settingValues"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * Keeps one of the reader's settings on the value in effect for this book.
 *
 * The value the reader holds when react-reader meets it, such as the one it
 * was created with, is replaced, not reported. A value the reader takes after
 * that and that is not the value in effect, such as one set with
 * `reader.settings.update()`, is reported to the app as `"internal"`. While the
 * app gives a value with the scope in effect, the reader keeps it until the
 * value in effect changes.
 */
export const useSyncReaderSettingWithManagedValue = <
  Name extends ManagedSettingName,
>(
  name: Name,
) => {
  const context = useReaderContext()
  const settingSources = useReaderContextValue([...MANAGED_SETTING_SOURCE_KEYS])
  const { reader } = settingSources
  const screen = useScreenSettingsScopeReference()
  const scopeInEffect = getSettingScopeReferenceInEffect(
    settingSources,
    name,
    screen,
  )
  const { appliedValue: valueInEffect } = getManagedSettingValuesForScope(
    settingSources,
    name,
    scopeInEffect,
  )
  const scopeInEffectRef = useLiveRef(scopeInEffect)
  const valueInEffectRef = useLiveRef(valueInEffect)

  // Declared before the subscription below: the reader holds the value in
  // effect by the time it subscribes, so the value it meets is not reported.
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

  const reportReaderValuesOtherThanValueInEffect = useCallback(
    function reportReaderValuesOtherThanValueInEffect() {
      return reader?.settings.values$.pipe(
        map((settings) => settings[name]),
        distinctUntilChanged(),
        filter(function isOtherThanValueInEffect(readerValue) {
          return readerValue !== valueInEffectRef.current
        }),
        tap(function reportInternalChange(readerValue) {
          changeManagedSettingValue(
            context,
            name,
            scopeInEffectRef.current,
            readerValue,
            "internal",
          )
        }),
      )
    },
    [reader, name, context, scopeInEffectRef, valueInEffectRef],
  )

  useSubscribe(reportReaderValuesOtherThanValueInEffect)
}
