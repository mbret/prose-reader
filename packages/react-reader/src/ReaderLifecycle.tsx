import { useEffect } from "react"
import { useLiveRef } from "reactjrx"
import type { ReactReaderReader } from "./context/context"
import {
  useReaderContext,
  useReaderContextValue,
} from "./context/useReaderContext"
import { getManagedSettingValuesInEffect } from "./settings/settingValues"
import { useScreenSettingsScopeReference } from "./settings/useScreenSettingsScopeReference"

export function ReaderLifecycle({
  createReader,
}: {
  createReader: (() => ReactReaderReader) | undefined
}) {
  const context = useReaderContext()
  const { readerElement } = useReaderContextValue(["readerElement"])
  const screen = useScreenSettingsScopeReference()
  const screenRef = useLiveRef(screen)

  useEffect(
    function createReaderInTheViewElement() {
      // The view takes its element back in the commit that removes it, before
      // this render's `readerElement` follows.
      const readerElementStillLent =
        context.value.readerElement === readerElement
          ? readerElement
          : undefined

      if (!createReader || !readerElementStillLent) return

      const reader = createReader()

      reader.settings.update(
        getManagedSettingValuesInEffect(
          { ...context.value, reader },
          screenRef.current,
        ),
      )
      reader.mount(readerElementStillLent)
      context.update((old) => ({ ...old, reader }))

      return function destroyReader() {
        reader.destroy()
        context.update((old) => ({
          ...old,
          reader: undefined,
          selectedHighlight: undefined,
          uncontrolledSettingsByScope: {
            ...old.uncontrolledSettingsByScope,
            book: undefined,
          },
        }))
      }
    },
    [createReader, readerElement, context, screenRef],
  )

  return null
}
