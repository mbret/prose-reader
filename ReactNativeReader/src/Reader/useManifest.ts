import { Manifest } from '@oboku/reader';
import { createArchiveFromUrls, getManifestFromArchive } from '@oboku/reader-streamer';
import { useEffect, useState } from 'react'
import RNFS from 'react-native-fs';
import { useOrigin } from './Server';

export const useManifest = () => {
  const [manifest, setManifest] = useState<Manifest | undefined>()
  const origin = useOrigin()

  useEffect(() => {
    if (origin) {
      (async () => {
        const content = await RNFS.readDirAssets('haruko')
        const urls = content.map(file => `${origin}/${file.path}`)

        const archive = await createArchiveFromUrls(urls)

        const response = await getManifestFromArchive(archive, { baseUrl: '' });

        const createdManifest: Manifest = await response.json();

        // console.log(createdManifest)

        setManifest(createdManifest)
      })();
    }
  }, [origin])

  return manifest
}
