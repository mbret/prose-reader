import { STREAMER_URL_PREFIX } from "./constants"

// export const extractEpubPathFromUrl = (url: string) => {
//   const lastChar = url.substr(-1)
//   const normalizedUrlWithTrailingSlash = lastChar !== '/' ? `${url}/` : url
//   const { pathname } = new URL(normalizedUrlWithTrailingSlash)
//   const search = `/${STREAMER_URL_PATH}/`
//   const startOfSearch = Math.max(0, pathname.indexOf(search))
//   const urlWithoutPrefix = pathname.substring(startOfSearch + search.length)

//   const nextSlashIndex = urlWithoutPrefix.indexOf('/')

//   if (nextSlashIndex !== -1) {
//     return urlWithoutPrefix.substring(0, urlWithoutPrefix.indexOf('/'))
//   }

//   return urlWithoutPrefix || undefined
// }
// import { STREAMER_URL_PATH } from '../constants.shared'
// import { extractEpubPathFromUrl } from './extractEpubPathFromUrl.shared'

// describe.each([
//   [`https://reader.com/${STREAMER_URL_PATH}/epub`, 'epub'],
//   [
//     `https://reader.com/ReadNow/${STREAMER_URL_PATH}/epub/META-INF/container.xml`,
//     'epub',
//   ],
//   [`https://reader.com/ReadNow/${STREAMER_URL_PATH}`, undefined],
// ])('Given %s', (url, result) => {
//   it(`should return ${result}`, () => {
//     expect(extractEpubPathFromUrl(url)).toBe(result)
//   })
// })

const extractEpubLocationFromUrl = (url: string) => {
  const { pathname } = new URL(url)
  const urlWithoutPrefix = pathname.substring(`/${STREAMER_URL_PREFIX}/`.length)
  const nextSlashIndex = urlWithoutPrefix.indexOf('/')

  if (nextSlashIndex !== -1) {
    return urlWithoutPrefix.substring(0, urlWithoutPrefix.indexOf('/'))
  }

  return urlWithoutPrefix
}

export const getEpubUrlFromLocation = (epubLocation: string) =>{
  try {
    return atob(epubLocation)
  } catch (e) {
    return `${location.origin}/epubs/${epubLocation}`
  }
}

export const extractInfoFromEvent = (event: any) => {
  const epubLocation = extractEpubLocationFromUrl(event.request.url)
  const epubFileName = epubLocation
  const epubUrl = getEpubUrlFromLocation(epubLocation)

  return {
    epubUrl,
    epubFileName
  }
}

export const getResourcePath = (event: any) => {
  const url = new URL(event.request.url)
  const { epubFileName } = extractInfoFromEvent(event)

  return decodeURIComponent(url.pathname.replace(`/${STREAMER_URL_PREFIX}/${epubFileName}/`, ``))
}