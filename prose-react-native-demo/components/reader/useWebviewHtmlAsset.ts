import { useAssets } from "expo-asset"
import { readAsStringAsync } from "expo-file-system"
import { useEffect, useState } from "react"

export function useWebviewHtmlAsset() {
  const [html, setHtml] = useState<string | undefined>()
  const [assets] = useAssets([require("@/assets/index.html")])

  useEffect(() => {
    ;(async () => {
      const asset = assets?.[0]

      if (asset?.localUri) {
        const fileContents = await readAsStringAsync(asset.localUri)
        setHtml(fileContents)
      }
    })()
  }, [assets])

  return { html }
}
