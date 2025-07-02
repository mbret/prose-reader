import { Streamer } from "@prose-reader/streamer"

export class ReactNativeStreamer extends Streamer {
  async fetchResourceAsData({
    key,
    resourcePath,
  }: {
    key: string
    resourcePath: string
  }) {
    const resource = await super.fetchResource({ key, resourcePath })

    return {
      data: await resource.text(),
      headers: Object.fromEntries(resource.headers.entries()),
    }
  }
}
