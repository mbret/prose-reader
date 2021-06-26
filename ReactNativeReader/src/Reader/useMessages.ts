import { useCallback } from 'react'
import WebView from 'react-native-webview'
import { MessageDown } from '../../web/src/types/shared'

export const usePostMessageDown = (webViewRef: WebView | undefined) => {
  const postMessageDown = useCallback((message: MessageDown) => {
    webViewRef?.injectJavaScript(`
      window.postDownMessage(${JSON.stringify(message)});
      true;
    `)
  }, [webViewRef])

  return postMessageDown
}
