import { useCallback } from "react"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import type {
  ManagedSettingName,
  ManagedSettingValues,
} from "./managedSettings"
import {
  changeManagedSettingValue,
  getManagedSettingValuesForScope,
  getSettingScopeReferenceInEffect,
  MANAGED_SETTING_SOURCE_KEYS,
} from "./settingValues"
import type {
  ReactReaderSettingsScope,
  ReactReaderSettingsScopeReference,
} from "./types"
import { useScreenSettingsScopeReference } from "./useScreenSettingsScopeReference"

/**
 * What a menu needs to edit a setting react-reader manages: its scopes, each
 * scope's values, and a change for a scope, `undefined` setting it back to the
 * value it inherits.
 */
export const useManagedSetting = <Name extends ManagedSettingName>(
  name: Name,
) => {
  const context = useReaderContext()
  const screen = useScreenSettingsScopeReference()
  const settingSources = useReaderContextValue([
    ...MANAGED_SETTING_SOURCE_KEYS,
    "onSettingsScopesChange",
  ])

  const getValuesForScope = (scope: ReactReaderSettingsScopeReference) =>
    getManagedSettingValuesForScope(settingSources, name, scope)

  const changeValueForScope = useCallback(
    function changeValueForScope(
      scope: ReactReaderSettingsScopeReference,
      value: ManagedSettingValues[Name] | undefined,
    ) {
      changeManagedSettingValue(context, name, scope, value, scope)
    },
    [name, context],
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
    activeScope: settingSources.settingsScopes
      ? getSettingScopeReferenceInEffect(settingSources, name, screen)
      : undefined,
    onActiveScopeChange: settingSources.onSettingsScopesChange
      ? changeScope
      : undefined,
    getValuesForScope,
    changeValueForScope,
  }
}
