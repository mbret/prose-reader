declare module 'react-native-static-server' {
  export default class StaticServer {
    constructor(port: number, path?: string)
    start: () => Promise<string>
    stop: () => void
    isRunning: () => Promise<boolean>
  }
}