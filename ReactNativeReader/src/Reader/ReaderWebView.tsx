import React, { forwardRef, ComponentProps } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { useJsAssets } from './useJsAssets';
import { useInjectableScript } from './useInjectableScript';
import { Manifest } from '@prose-reader/core';

type Props = {
  onMenuToggle: () => void,
  manifest: Manifest | undefined
} & Pick<ComponentProps<typeof WebView>, 'onMessage'>

export const ReaderWebView = forwardRef(({ manifest, onMessage }: Props, ref) => {
  const jsAssets = useJsAssets()
  const injectableScript = useInjectableScript(manifest)

  return (
    <>
      {injectableScript && (
        <WebView
          ref={ref as any}
          containerStyle={styles.webview}
          originWhitelist={['*']}
          /**
           * By default we serve the asset bundle. If you make any change to
           * the web code, you need to build and `npm run android` again.
           * See below for development flow.
           */
          source={{ uri: 'file:///android_asset/index.html' }}
          /**
           * If you want to serve the development bundle
           * uncomment this line. This will no longer serve the web bundle from
           * static assets but directly from local development server.
           */
          // source={{ uri: 'http://localhost:8082/' }}
          onMessage={onMessage}
          allowUniversalAccessFromFileURLs
          injectedJavaScript={jsAssets}
          injectedJavaScriptBeforeContentLoaded={injectableScript}
        />
      )}
    </>
  );
})

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
})
