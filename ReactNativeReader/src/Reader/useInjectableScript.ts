import { Manifest } from '@oboku/reader';
import { useOrigin } from './Server';

export const useInjectableScript = (manifest: Manifest | undefined) => {
  const origin = useOrigin()

  if (!origin || !manifest) {
    return undefined
  }

  return  `
    window.MANIFEST = ${JSON.stringify(manifest)};
    window.SETTINGS = ${JSON.stringify({
      isNativeApp: true,
      origin,
    })};
    true; // note: this is required, or you'll sometimes get silent failures
  `
}
