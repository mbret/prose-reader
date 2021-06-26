import { useEffect, useState } from "react"
import RNFS from 'react-native-fs';

export const useJsAssets = () => {
  const [jsAsset, setJsAsset] = useState<string | undefined>()

  useEffect(() => {
    (async () => {
      const asset = await RNFS.readFileAssets('bundle.js')
      setJsAsset(asset)
    })()
  }, [])

  return jsAsset
}
