import { createContext, useContext } from 'react';
import type { Manifest } from '@prose-reader/shared';

export const ReaderContext = createContext<{
  manifest: Manifest | null;
}>({
  manifest: null,
});

export const useManifest = () => {
  return useContext(ReaderContext).manifest;
};

export const ReaderProvider = ({ children, manifest }: { children: React.ReactNode; manifest: Manifest | null }) => {
  return <ReaderContext.Provider value={{ manifest }}>{children}</ReaderContext.Provider>;
};