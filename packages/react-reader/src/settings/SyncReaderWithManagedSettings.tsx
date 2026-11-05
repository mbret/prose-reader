import { memo } from "react"
import {
  MANAGED_SETTING_NAMES,
  type ManagedSettingName,
} from "./managedSettings"
import { useSyncReaderSettingWithManagedValue } from "./useSyncReaderSettingWithManagedValue"

const SyncReaderSettingWithManagedValue = memo(
  function SyncReaderSettingWithManagedValue({
    name,
  }: {
    name: ManagedSettingName
  }) {
    useSyncReaderSettingWithManagedValue(name)

    return null
  },
)

/**
 * Keeps the reader on the settings react-reader manages, and reports a value it
 * takes otherwise as `"internal"`.
 */
export const SyncReaderWithManagedSettings = memo(
  function SyncReaderWithManagedSettings() {
    return MANAGED_SETTING_NAMES.map((name) => (
      <SyncReaderSettingWithManagedValue key={name} name={name} />
    ))
  },
)
