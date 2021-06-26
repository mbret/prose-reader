import { useEffect, useState } from 'react';
import StaticServer from 'react-native-static-server';
import RNFS from 'react-native-fs';
import { atom, useRecoilValue, useSetRecoilState } from 'recoil';

/**
 * We serve content from user data path.
 * Ideally each book content is downloaded and stored in there in
 * its folder.
 */
const STATIC_PATH = RNFS.DocumentDirectoryPath + '/www'
const SERVER_PORT = 3333

const originState = atom<string | undefined>({
  key: 'originState',
  default: undefined,
})

export const Server = () => {
  const setOrigin = useSetRecoilState(originState)
  const [server, setServer] = useState<StaticServer | null>(null)

  useEffect(() => {
    (async () => {

      if (server) {
        return
      }

      const content = await RNFS.readDirAssets('haruko')

      RNFS.mkdir(STATIC_PATH)

      try {
        /**
         * We copy the static assets into user data folder. For the sake of this
         * example we already have the files in asset folder but it could be downloaded online
         * and copied over the user data path (progressive as well).
         */
        await Promise.all(content.map(async ({ name, path }) => {
          await RNFS.copyFileAssets(path, `${STATIC_PATH}/${name}`)
        }))
      } catch (e) {
        console.error(e)
      }

      let newServer = new StaticServer(SERVER_PORT, STATIC_PATH);
      setServer(newServer)

      const newOrigin = await newServer.start()

      setOrigin(newOrigin)
    })()

    return () => {
      server?.stop();
    }
  }, [setOrigin, setServer, server])

  server?.isRunning().then(console.log)

  return null
}

export const useOrigin = () => {
  return useRecoilValue(originState)
}
