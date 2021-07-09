import { Archive } from "../archives"

export const getResourceFromArchive = async (archive: Archive, resourcePath: string) => {
  const file = Object.values(archive.files).find(file => file.uri === resourcePath)

  if (!file) {
    throw new Error('no file found')
  }

  const response = new Response(await file.blob(), {
    status: 200,
    headers: {
      ...file.uri.endsWith(`.css`) && {
        'Content-Type': `text/css; charset=UTF-8`
      },
      ...file.uri.endsWith(`.jpg`) && {
        'Content-Type': `image/jpg`
      },
      ...file.uri.endsWith(`.xhtml`) && {
        'Content-Type': `application/xhtml+xml`
      },
      ...file.encodingFormat && {
        'Content-Type': file.encodingFormat
      }
      // 'Cache-Control': `no-cache, no-store, no-transform`
    }
  })

  return response
}