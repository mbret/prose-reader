import { Archive } from "../archives"

export const getResourceFromArchive = async (archive: Archive, resourcePath: string) => {
  const file = Object.values(archive.files).find(file => file.uri === resourcePath)

  if (!file) {
    throw new Error('no file found')
  }

  const blob = await file.blob()

  // if (file.stream) {
  //   const stream = file.stream()

  //   console.log(file, stream)
  //   stream.on(`data`, data => {
  //     console.log(`data`, data)
  //   })
  //   stream.on(`error`, data => {
  //     console.error(`error`, data)
  //   })
  //   stream.on(`end`, () => {
  //     console.log(`end`)
  //   })

    
  // }

  // const stream = file.stream!()

  // const readableStream = new ReadableStream({
  //   start(controller) {
  //     function push() {
  //       stream.on(`data`, data => {
  //         controller.enqueue(data)
  //       })
  //       stream.on(`error`, data => {
  //         console.error(`error`, data)
  //       })
  //       stream.on(`end`, () => {
  //         controller.close()
  //       })

  //       stream.resume()
  //     }

  //     push();
  //   }
  // })

  const response = new Response(blob, {
    // status: 206,
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
      ...file.uri.endsWith(`.mp4`) && {
        'Content-Type': `video/mp4`
      },
      ...blob.type && {
        'Content-Type': blob.type,
      },
      ...file.encodingFormat && {
        'Content-Type': file.encodingFormat
      },
      // 'Cache-Control': `no-cache, no-store, no-transform`
    }
  })

  return response
}