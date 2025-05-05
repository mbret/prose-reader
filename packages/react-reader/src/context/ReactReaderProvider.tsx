import type { Reader } from "@prose-reader/core"
import { memo, useEffect, useMemo } from "react"
import {
  signal,
  useConstant,
  useLiveRef,
  useSignalState,
  useSubscribe,
} from "reactjrx"
import { Subject, tap } from "rxjs"
import type { ReaderNotification } from "../notifications/types"
import { ReaderContext } from "./context"

export const ReactReaderProvider = memo(
  ({
    children,
    reader,
    quickMenuOpen,
    onQuickMenuOpenChange,
  }: {
    children?: React.ReactNode
    reader: Reader | undefined
    quickMenuOpen: boolean
    onQuickMenuOpenChange: (open: boolean) => void
  }) => {
    const [, quickMenuSignal] = useSignalState(() =>
      signal({
        default: quickMenuOpen,
      }),
    )
    const notificationsSubject = useConstant(
      () => new Subject<ReaderNotification>(),
    )
    const onQuickMenuOpenChangeLiveRef = useLiveRef(onQuickMenuOpenChange)

    const value = useMemo(
      () => ({
        quickMenuSignal,
        reader,
        notificationsSubject,
      }),
      [quickMenuSignal, reader, notificationsSubject],
    )

    useEffect(() => {
      quickMenuSignal.setValue(quickMenuOpen)
    }, [quickMenuOpen, quickMenuSignal])

    useSubscribe(
      () => quickMenuSignal.pipe(tap(onQuickMenuOpenChangeLiveRef.current)),
      [quickMenuSignal, onQuickMenuOpenChangeLiveRef],
    )

    return (
      <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
    )
  },
)
