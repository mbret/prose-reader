import { useCallback } from "react"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import {
  getAppSettingValueInEffect,
  getAppSettingValueWhenScopeInEffect,
  getSettingScopeReferenceInEffect,
} from "./appSettingValues"
import type {
  ManagedSettingName,
  ManagedSettingValues,
  ReactReaderSettings,
} from "./managedSettings"
import type {
  ReactReaderSettingsScope,
  ReactReaderSettingsScopeReference,
} from "./types"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * What a menu needs to edit a setting react-reader manages: its scopes, the
 * value of each, and a change, which is reported to the app and, when the app
 * gives the setting no value, applied to react-reader's own.
 */
export const useManagedSetting = <Name extends ManagedSettingName>(
  name: Name,
) => {
  const context = useReaderContext()
  const screen = useScreenSettingsScopeReference()
  const appSettingValues = useReaderContextValue([
    "settings",
    "settingsByScope",
    "settingsScopes",
    "onSettingsScopesChange",
    "uncontrolledSettings",
  ])

  /** What a scope's tab shows: the value the setting takes with that scope. */
  const getValueForScope = (scope: ReactReaderSettingsScopeReference) =>
    getAppSettingValueWhenScopeInEffect(appSettingValues, name, scope) ??
    appSettingValues.uncontrolledSettings[name]

  const changeValueForScope = useCallback(
    function changeValueForScope(
      scope: ReactReaderSettingsScopeReference,
      value: ManagedSettingValues[Name],
    ) {
      const changes: ReactReaderSettings = {}
      const isValueInEffectReactReaderOwn =
        getAppSettingValueInEffect(context.value, name, screen) === undefined &&
        scope === getSettingScopeReferenceInEffect(context.value, name, screen)

      changes[name] = value

      if (isValueInEffectReactReaderOwn) {
        context.update((old) => ({
          ...old,
          uncontrolledSettings: { ...old.uncontrolledSettings, ...changes },
        }))
      }

      context.value.onSettingsChange?.(changes, scope)
    },
    [name, context, screen],
  )

  const changeScope = useCallback(
    function changeScope(scope: ReactReaderSettingsScope) {
      const changes: Partial<
        Record<ManagedSettingName, ReactReaderSettingsScope>
      > = {}

      changes[name] = scope
      context.value.onSettingsScopesChange?.(changes)
    },
    [name, context],
  )

  return {
    activeScope: appSettingValues.settingsScopes
      ? getSettingScopeReferenceInEffect(appSettingValues, name, screen)
      : undefined,
    onActiveScopeChange: appSettingValues.onSettingsScopesChange
      ? changeScope
      : undefined,
    getValueForScope,
    changeValueForScope,
  }
}
