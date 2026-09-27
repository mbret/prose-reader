import { useCallback } from "react"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import {
  getAppSettingValueForScope,
  getAppSettingValueInEffect,
  getSettingScopeInEffect,
} from "./appSettingValues"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "./managedSettings"
import type {
  PROSE_REACT_READER_SETTINGS_SCOPE,
  PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
} from "./types"

/**
 * What a menu needs to edit a setting react-reader manages: its scopes, the
 * value of each, and a change, which is reported to the app and, when the app
 * gives the setting no value, applied to react-reader's own.
 */
export const useManagedSetting = <Name extends ManagedSettingName>(
  name: Name,
) => {
  const context = useReaderContext()
  const appSettingValues = useReaderContextValue([
    "settings",
    "settingsByScope",
    "settingsScopes",
    "onSettingsScopesChange",
    "uncontrolledSettings",
  ])
  const valueInEffect =
    getAppSettingValueInEffect(appSettingValues, name) ??
    appSettingValues.uncontrolledSettings[name]

  const getValueForScope = (
    scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
  ) =>
    getAppSettingValueForScope(appSettingValues, name, scope) ?? valueInEffect

  const changeValueForScope = useCallback(
    function changeValueForScope(
      scope: PROSE_REACT_READER_SETTINGS_SCOPE_REFERENCE,
      value: ManagedSettingValues[Name],
    ) {
      const changes: Partial<ManagedSettingValues> = {}
      const isValueInEffectReactReaderOwn =
        getAppSettingValueInEffect(context.value, name) === undefined &&
        scope === getSettingScopeInEffect(context.value, name)

      changes[name] = value

      if (isValueInEffectReactReaderOwn) {
        context.update((old) => ({
          ...old,
          uncontrolledSettings: { ...old.uncontrolledSettings, ...changes },
        }))
      }

      context.value.onSettingsChange?.(changes, scope)
    },
    [name, context],
  )

  const changeScope = useCallback(
    function changeScope(scope: PROSE_REACT_READER_SETTINGS_SCOPE) {
      const changes: Partial<
        Record<ManagedSettingName, PROSE_REACT_READER_SETTINGS_SCOPE>
      > = {}

      changes[name] = scope
      context.value.onSettingsScopesChange?.(changes)
    },
    [name, context],
  )

  return {
    activeScope: appSettingValues.settingsScopes
      ? getSettingScopeInEffect(appSettingValues, name)
      : undefined,
    onActiveScopeChange: appSettingValues.onSettingsScopesChange
      ? changeScope
      : undefined,
    getValueForScope,
    changeValueForScope,
  }
}
