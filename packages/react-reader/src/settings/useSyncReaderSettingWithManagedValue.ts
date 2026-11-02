import { useCallback, useEffect } from "react"
import { useLiveRef, useSubscribe } from "reactjrx"
import { distinctUntilChanged, filter, map, skip } from "rxjs"
import { useReader } from "../context/useReader"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import type { ManagedSettingName, ReactReaderSettings } from "./managedSettings"
import {
  getAppSettingValueWhenScopeInEffect,
  getSettingScopeReferenceInEffect,
  getSettingValueForScope,
  withUncontrolledSettingChangesForScope,
} from "./settingValues"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * Keeps one of the reader's settings on the value in effect for this book: the
 * value of the setting's scope, the app's or else react-reader's own, then the
 * global one, then `defaultSettings`, then the reader's default.
 *
 * The value the reader holds when react-reader meets it, such as the one it
 * was created with, is not a change: the value in effect replaces it. A value
 * the reader takes after that and that is not the value in effect, such as one
 * set with `reader.settings.update()`, is reported to the app as `"internal"`.
 * It becomes react-reader's own value for the scope in effect when the app
 * gives none with that scope in effect. Otherwise the reader keeps it until the
 * value in effect changes.
 */
export const useSyncReaderSettingWithManagedValue = <
  Name extends ManagedSettingName,
>(
  name: Name,
) => {
  const reader = useReader()
  const context = useReaderContext()
  const settingSources = useReaderContextValue([
    "settings",
    "settingsByScope",
    "settingsScopes",
    "defaultSettings",
    "uncontrolledSettingsByScope",
  ])
  const screen = useScreenSettingsScopeReference()
  const scopeInEffect = getSettingScopeReferenceInEffect(
    settingSources,
    name,
    screen,
  )
  const valueInEffect = getSettingValueForScope(
    settingSources,
    name,
    scopeInEffect,
    reader?.settings.defaults,
  )
  const scopeInEffectRef = useLiveRef(scopeInEffect)
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

  const reportValuesTheReaderTakesOtherwise = useCallback(
    function reportValuesTheReaderTakesOtherwise() {
      return reader?.settings.values$
        .pipe(
          map((settings) => settings[name]),
          distinctUntilChanged(),
          skip(1),
          filter(function isOtherThanValueInEffect(readerValue) {
            return readerValue !== valueInEffectRef.current
          }),
        )
        .subscribe(function reportInternalChange(readerValue) {
          const changes: ReactReaderSettings = {}
          const scope = scopeInEffectRef.current
          const hasAppValueWithScopeInEffect =
            getAppSettingValueWhenScopeInEffect(context.value, name, scope) !==
            undefined

          changes[name] = readerValue

          if (!hasAppValueWithScopeInEffect) {
            context.update(
              withUncontrolledSettingChangesForScope(scope, changes),
            )
          }

          context.value.onSettingsChange?.(changes, "internal")
        })
    },
    [reader, name, context, scopeInEffectRef, valueInEffectRef],
  )

  useSubscribe(reportValuesTheReaderTakesOtherwise)
}
