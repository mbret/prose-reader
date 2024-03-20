import { Manifest, Reader } from "@prose-reader/core"
import { useEffect } from "react"

type LoadOptions = Parameters<Reader["load"]>[1]

export const useLoadReader = <Instance extends Reader>({
  manifest,
  loadOptions,
  reader,
}: {
  manifest?: Manifest
  loadOptions?: LoadOptions
  reader?: Instance
}) => {
  useEffect(() => {
    if (manifest && reader && loadOptions) {
      reader.load(manifest, loadOptions)
    }
  }, [manifest, reader, loadOptions])

  return { reader }
}
