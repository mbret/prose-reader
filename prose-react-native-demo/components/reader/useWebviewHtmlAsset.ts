import { useAssets } from "expo-asset"
import { readAsStringAsync } from "expo-file-system"
import { useEffect, useState } from "react"

export function useWebviewHtmlAsset() {
  const [html, setHtml] = useState<string | undefined>()
  // Built from `web/` by `npm run web:build`, which every script that starts
  // Metro runs first. It is not committed: resolving it fails until built.
  const [assets] = useAssets([require("@/web/dist/index.html")])

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
