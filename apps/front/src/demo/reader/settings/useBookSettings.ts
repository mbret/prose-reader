import type { ReactReader } from "@prose-reader/react-reader"
import { type ComponentProps, useEffect, useState } from "react"
import { type Signal, signal, useSignal } from "reactjrx"

type ReactReaderProps = ComponentProps<typeof ReactReader>

export type BookSettings = {
  fontSize?: number
  fontSizeScope?: Parameters<
    NonNullable<ReactReaderProps["onFontSizeScopeChange"]>
  >[0]
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
