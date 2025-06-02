import { useEffect, useState } from 'react';
import type { Archive } from '@prose-reader/streamer';
import type { Directory } from 'expo-file-system/next';
import { createArchiveFromExpoFileSystemNext } from '@prose-reader/react-native';

export const useArchive = (unzippedFileDirectory: Directory | null) => {
  const [archive, setArchive] = useState<Archive | null>(null);

  useEffect(() => {
    (async () => {
      if (!unzippedFileDirectory) {
        return;
      }

      try {
        const archive = await createArchiveFromExpoFileSystemNext(unzippedFileDirectory, {
          orderByAlpha: true,
          name: 'archive.zip',
        });
  
        setArchive(archive);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [unzippedFileDirectory]);

  return { data: archive };
};
