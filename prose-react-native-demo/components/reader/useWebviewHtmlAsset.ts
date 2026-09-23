import { useAssets } from "expo-asset"
import { File } from "expo-file-system"
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
        // The `readAsStringAsync` exported by `expo-file-system` is a stub
        // that throws; reading goes through `File` instead.
        const fileContents = await new File(asset.localUri).text()
        setHtml(fileContents)
      }
    })()
  }, [assets])

  return { html }
}
