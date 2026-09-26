import type { ReactReader } from "@prose-reader/react-reader"
import { type ComponentProps, useCallback } from "react"
import { useLiveRef } from "reactjrx"

type ReactReaderProps = ComponentProps<typeof ReactReader>

export type SettingScope = Parameters<
  NonNullable<ReactReaderProps["onFontSizeScopeChange"]>
>[0]
export type SettingScopeReference = NonNullable<
  ReactReaderProps["fontSizeScope"]
>
export type ScreenScopeReference = Extract<
  SettingScopeReference,
  "mobile" | "tablet" | "desktop"
>

/**
 * A setting the reader's menus offer per scope, which the demo stores: the
 * value that applies to this book, from the scope the book uses and the
 * screen, every scope's value, and callbacks saving a value or the scope. A
 * change the reader reports as `"internal"` is not saved.
 */
export const useScopedSetting = <Value>({
  scope,
  screen,
  values,
  saveValue,
  saveScope,
}: {
  scope: SettingScope | undefined
  screen: ScreenScopeReference | undefined
  values: Record<SettingScopeReference, Value | undefined>
  saveValue: (reference: SettingScopeReference, value: Value) => void
  saveScope: (scope: SettingScope) => void
}) => {
  const scopeReference: SettingScopeReference =
    scope === "screen" ? (screen ?? "desktop") : (scope ?? "global")
  const saveValueRef = useLiveRef(saveValue)
  const saveScopeRef = useLiveRef(saveScope)

  const onChange = useCallback(
    function saveValueChosenInReader(
      from: SettingScopeReference | "internal",
      value: Value,
    ) {
      if (from !== "internal") saveValueRef.current(from, value)
    },
    [saveValueRef],
  )

  const onScopeChange = useCallback(
    function saveScopeChosenInReader(scope: SettingScope) {
      saveScopeRef.current(scope)
    },
    [saveScopeRef],
  )

  return {
    scopeReference,
    value: values[scopeReference],
    values,
    onChange,
    onScopeChange,
  }
}
