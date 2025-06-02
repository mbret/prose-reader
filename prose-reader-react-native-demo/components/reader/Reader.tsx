import { ReaderProvider } from "@prose-reader/react-native"
import type { Directory } from "expo-file-system/next"
import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { BottomMenu } from "./BottomMenu"
import { TopMenu } from "./TopMenu"
import { useArchive } from "./useArchive"
import { useCreateReader } from "./useCreateReader"
import { useManifestFromArchive } from "./useManifestFromArchive"
import { useWebviewHtmlAsset } from "./useWebviewHtmlAsset"

export const Reader = ({
  unzippedFileDirectory,
}: { unzippedFileDirectory: Directory | null }) => {
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false)
  const { html } = useWebviewHtmlAsset()
  const { data: archive } = useArchive(unzippedFileDirectory)
  const { data: manifest } = useManifestFromArchive({ archive })
  const reader = useCreateReader({ archive })
  const ReaderWebView = reader?.ReaderWebView

  useEffect(() => {
    if (manifest && isWebViewLoaded && reader) {
      reader.load(manifest)
    }
  }, [manifest, isWebViewLoaded, reader])

  if (!reader) {
    return null
  }

  return (
    <ReaderProvider reader={reader}>
      <View style={styles.container}>
        {!!html && !!ReaderWebView && (
          <ReaderWebView
            style={styles.webview}
            originWhitelist={["*"]}
            source={{ html }}
            onLoadEnd={() => {
              setIsWebViewLoaded(true)
            }}
            webviewDebuggingEnabled
            javaScriptEnabled={true}
          />
        )}
        <TopMenu />
        <BottomMenu />
      </View>
    </ReaderProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
})
