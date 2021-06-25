import { useEffect, useState } from 'react';
import StaticServer from 'react-native-static-server';
import RNFS from 'react-native-fs';
import { atom, useRecoilState, useRecoilValue } from 'recoil';

let STATIC_PATH = RNFS.DocumentDirectoryPath + '/www'
// const path = RNFetchBlob.fs.dirs.DocumentDir + '/' + root

const originState = atom<string | undefined>({
  key: `originState`,
  default: undefined,
})

export const Server = () => {
  const [origin, setOrigin] = useRecoilState(originState)
  const [server, setServer] = useState<StaticServer | null>(null)

  useEffect(() => {
    ; (async () => {

      if (server) return

      const content = await RNFS.readDirAssets(`haruko`)

      RNFS.mkdir(STATIC_PATH)

      try {
        await RNFS.copyFileAssets(`index.html`, `${STATIC_PATH}/index.html`)
        await Promise.all(content.map(async ({ name, path }) => {
          await RNFS.copyFileAssets(path, `${STATIC_PATH}/${name}`)
        }))
      } catch (e) {
        console.error(e)
      }

      // try {
      //   await RNFetchBlob.fs.mkdir(path)
      // } catch (e) {
      //   console.log(`directory is created ${path}`)
      // }

      let newServer = new StaticServer(3333, STATIC_PATH);
      setServer(newServer)

      const newOrigin = await newServer.start()

      newServer?.isRunning().then(value => console.log(`running`, value))

      console.log(newOrigin)
      console.log(STATIC_PATH)
      // console.log(content)
      // console.log(await RNFS.readDir(STATIC_PATH))

      setOrigin(newOrigin)
    })()

    return () => {
      console.log('FOOO', server)
      server?.stop();
    }
  }, [setOrigin, setServer, server])

  server?.isRunning().then(console.log)

  return null
}

export const useOrigin = () => {
  return useRecoilValue(originState)
}