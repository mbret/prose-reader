import { isShallowEqual } from "@prose-reader/shared"
import { type ReactNode, useLayoutEffect } from "react"
import { signal, useConstant, useMemoCompare } from "reactjrx"
import {
  getDefaultValue,
  type ProviderContextType,
  ReaderContext,
} from "./context"

export function ReaderContextProvider({
  children,
  ...props
}: ProviderContextType & { children?: ReactNode }) {
  const context = useConstant(() => signal({ default: getDefaultValue() }))
  const memoizedProps = useMemoCompare(props, isShallowEqual)

  // A layout effect runs before the passive effects of its commit, so the
  // reader's creation reads the props it copies.
  useLayoutEffect(
    function replacePropsInContext() {
      // A prop the app stops passing must not keep its last value.
      context.update(
        ({
          reader,
          readerElement,
          uncontrolledSettings,
          notificationsSubject,
          quickMenuBottomBarBoundingBoxSignal,
          selectedHighlight,
        }) => ({
          reader,
          readerElement,
          uncontrolledSettings,
          notificationsSubject,
          quickMenuBottomBarBoundingBoxSignal,
          selectedHighlight,
          ...memoizedProps,
        }),
      )
    },
    [context, memoizedProps],
  )

  return (
    <ReaderContext.Provider value={context}>{children}</ReaderContext.Provider>
  )
}
