import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomMenu } from './BottomMenu';
import type WebView from 'react-native-webview';
import { useReaderHtmlAsset } from './useReaderHtmlAsset';
import { useManifestFromArchive } from './useManifestFromArchive';
import { ReaderProvider } from './ReaderProvider';
import { TopMenu } from './TopMenu';
import { useArchive } from './useArchive';
import type { Directory } from 'expo-file-system/next';
import { ProseReaderProvider } from './ProseReaderProvider';
import { useCreateReader } from './useCreateReader';

export const Reader = ({ unzippedFileDirectory }: { unzippedFileDirectory: Directory | null }) => {
  const { data: archive } = useArchive(unzippedFileDirectory);
  const { webviewBridge, appBridge } = useCreateReader({ archive });
  const { html } = useReaderHtmlAsset();
  const [isLoaded, setIsLoaded] = useState(false);
  const { WebView: BridgedWebView, postMessage } = webviewBridge ?? {};
  const webviewRef = useRef<WebView>(null);
  const { data: manifest } = useManifestFromArchive({ archive });

  useEffect(() => {
    if (webviewRef.current && manifest && html && isLoaded && postMessage) {
      postMessage('load', { manifest });
    }
  }, [manifest, html, isLoaded, postMessage]);

  if (!webviewBridge || !appBridge || !BridgedWebView) {
    return null;
  }

  return (
    <ProseReaderProvider appBridge={appBridge} webview={webviewBridge}>
      <ReaderProvider manifest={manifest}>
        <View style={styles.container}>
          {!!html && (
            <BridgedWebView
              ref={webviewRef}
              style={styles.webview}
              originWhitelist={['*']}
              source={{ html }}
              onLoadEnd={() => {
                setIsLoaded(true);
              }}
              webviewDebuggingEnabled
              javaScriptEnabled={true}
            />
          )}
          <TopMenu />
          <BottomMenu />
        </View>
      </ReaderProvider>
    </ProseReaderProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
});
