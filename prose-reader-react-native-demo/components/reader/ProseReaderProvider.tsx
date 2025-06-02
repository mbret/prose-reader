import type { bridge, createWebView } from '@webview-bridge/react-native';
import type { appPostMessageSchema, ReaderBridge } from './bridge';
import { createContext, useContext } from 'react';

type WebviewType = ReturnType<typeof createWebView<ReaderBridge, typeof appPostMessageSchema>>;
type AppBridgeType = ReturnType<typeof bridge<ReaderBridge>>;

export const ProseReaderContext = createContext<
  | {
      webview: WebviewType;
      appBridge: AppBridgeType;
    }
  | undefined
>(undefined);

export const useProseReaderContext = () => {
  const context = useContext(ProseReaderContext);

  if (!context) {
    throw new Error('useProseReader must be used within a ProseReaderProvider');
  }

  return context;
};

export const ProseReaderProvider = ({
  children,
  appBridge,
  webview,
}: {
  children: React.ReactNode;
  appBridge: AppBridgeType;
  webview: WebviewType;
}) => {
  return (
    <ProseReaderContext.Provider value={{ webview, appBridge }}>
      {children}
    </ProseReaderContext.Provider>
  );
};
