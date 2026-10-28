import type {
  ReactReaderSettings,
  ReactReaderSettingsScope,
} from "@prose-reader/react-reader"
import { useEffect, useState } from "react"
import { type Signal, signal, useSignal } from "reactjrx"

/** For each setting react-reader manages, the scope it takes its value from. */
export type ReaderSettingsScopes = Partial<
  Record<keyof ReactReaderSettings, ReactReaderSettingsScope>
>

export type BookSettings = {
  /** This book's values of the settings react-reader manages. */
  readerSettings?: ReactReaderSettings
  /** The scope each of them takes its value from, for this book. */
  readerSettingsScopes?: ReaderSettingsScopes
}

export const useBookSettings = (epubKey: string) => {
  const [signalValue] = useState<Signal<BookSettings>>(() => {
    const _settings = localStorage.getItem(`book-${epubKey}-settings`) || "{}"

    try {
      return signal({
        default: JSON.parse(_settings),
      })
    } catch (error) {
      console.error(error)

      return signal({
        default: {},
      })
    }
  })

  useEffect(() => {
    signalValue.subscribe((settings) => {
      localStorage.setItem(`book-${epubKey}-settings`, JSON.stringify(settings))
    })
  }, [signalValue, epubKey])

  return useSignal(signalValue)
}
