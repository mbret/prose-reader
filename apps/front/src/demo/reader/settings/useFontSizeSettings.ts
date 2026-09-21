import type { ReactReader } from "@prose-reader/react-reader"
import { type ComponentProps, useCallback } from "react"
import { type Signal, useSignalValue } from "reactjrx"
import type { BookSettings } from "./useBookSettings"
import { useSettings } from "./useSettings"

type ReactReaderProps = ComponentProps<typeof ReactReader>
type ScopeReference = ReactReaderProps["fontSizeScope"]

export const useFontSizeSettings = (
  bookSettingsSignal: Signal<BookSettings>,
  breakpointValue?: "mobile" | "tablet" | "desktop",
) => {
  const [localSettings, setLocalSettings] = useSettings()
  const bookSettings = useSignalValue(bookSettingsSignal)
  const fontSizeScopeReference: ScopeReference =
    bookSettings.fontSizeScope === "screen"
      ? breakpointValue === "mobile"
        ? "mobile"
        : breakpointValue === "tablet"
          ? "tablet"
          : "desktop"
      : (bookSettings.fontSizeScope ?? "global")
  const fontSizeValue =
    bookSettings.fontSizeScope === "screen"
      ? fontSizeScopeReference === "mobile"
        ? localSettings.fontSizeScreenMobile
        : fontSizeScopeReference === "tablet"
          ? localSettings.fontSizeScreenTablet
          : localSettings.fontSizeScreenDesktop
      : bookSettings.fontSizeScope === "book"
        ? bookSettings.fontSize
        : localSettings.fontSizeGlobal
  const fontSizeValues = {
    global: localSettings.fontSizeGlobal,
    book: bookSettings.fontSize,
    mobile: localSettings.fontSizeScreenMobile,
    tablet: localSettings.fontSizeScreenTablet,
    desktop: localSettings.fontSizeScreenDesktop,
  }

  const onFontSizeChange: NonNullable<
    ComponentProps<typeof ReactReader>["onFontSizeChange"]
  > = useCallback(
    (from, fontSize) => {
      switch (from) {
        case "global":
          setLocalSettings((old) => ({ ...old, fontSizeGlobal: fontSize }))
          break
        case "book":
          bookSettingsSignal.update((old) => ({ ...old, fontSize }))
          break
        case "mobile":
          setLocalSettings((old) => ({
            ...old,
            fontSizeScreenMobile: fontSize,
          }))
          break
        case "tablet":
          setLocalSettings((old) => ({
            ...old,
            fontSizeScreenTablet: fontSize,
          }))
          break
        case "desktop":
          setLocalSettings((old) => ({
            ...old,
            fontSizeScreenDesktop: fontSize,
          }))
          break
      }
    },
    [bookSettingsSignal, setLocalSettings],
  )

  const onFontSizeScopeChange: NonNullable<
    ComponentProps<typeof ReactReader>["onFontSizeScopeChange"]
  > = useCallback(
    (fontSizeScope) => {
      bookSettingsSignal.update((old) => ({ ...old, fontSizeScope }))
    },
    [bookSettingsSignal],
  )

  return {
    fontSizeScopeReference,
    fontSizeValue,
    onFontSizeChange,
    onFontSizeScopeChange,
    fontSizeValues,
  }
}
