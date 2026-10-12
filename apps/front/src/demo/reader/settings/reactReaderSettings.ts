import type { ReactReader } from "@prose-reader/react-reader"
import type { ComponentProps } from "react"

type ReactReaderProps = ComponentProps<typeof ReactReader>

/** Values of the settings react-reader manages, as `reader.settings` holds them. */
export type ReaderSettings = NonNullable<ReactReaderProps["settings"]>

/** For each setting react-reader manages, the scope it takes its value from. */
export type ReaderSettingsScopes = Parameters<
  NonNullable<ReactReaderProps["onSettingsScopesChange"]>
>[0]

/** Where a value reported by react-reader comes from. */
export type ReaderSettingsChangeOrigin = Parameters<
  NonNullable<ReactReaderProps["onSettingsChange"]>
>[1]

export type ScreenScopeReference = Extract<
  ReaderSettingsChangeOrigin,
  "mobile" | "tablet" | "desktop"
>
