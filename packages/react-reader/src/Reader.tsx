import React, { ReactElement, useMemo, useState } from "react"
import { Manifest, Reader as ReaderInstance } from "@prose-reader/core"
import { RootContainer } from "./RootContainer"
import { useLoadReader } from "./useLoadReader"
import { ContainerElement } from "./ContainerElement"
import { useObserve } from "reactjrx"
import { EMPTY } from "rxjs"

export const ProseReactReader = <Options, Instance extends ReaderInstance>({
  manifest,
  loadOptions,
  reader,
  loadingElement,
}: {
  manifest?: Manifest
  options?: Omit<Options, "containerElement">
  loadOptions?: Omit<Parameters<Instance["load"]>[1], "containerElement">
  reader?: ReaderInstance
  loadingElement?: ReactElement
}) => {
  const [containerElement, setContainerElement] = useState<HTMLDivElement>()

  const loadOptionsWithContainer = useMemo(
    () =>
      loadOptions && containerElement
        ? {
            ...loadOptions,
            containerElement,
          }
        : undefined,
    [loadOptions, containerElement],
  )

  useLoadReader({ reader, manifest, loadOptions: loadOptionsWithContainer })

  const loadStatus = useObserve(() => (!reader ? EMPTY : reader?.$.loadStatus$), [reader])

  return (
    <RootContainer>
      <ContainerElement onRef={setContainerElement} visible={loadStatus === "ready"} />
      {loadStatus !== "ready" && loadingElement}
    </RootContainer>
  )
}
