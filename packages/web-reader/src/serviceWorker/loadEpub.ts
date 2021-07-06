import { loadAsync } from 'jszip'
import { Report } from '../report'
import { createArchiveFromText, Archive, createArchiveFromJszip } from '@oboku/reader-streamer'

let loading = false
let archive: Archive | undefined = undefined
let lastUrl: string | undefined

setInterval(() => {
  if (!loading && archive) {
    Report.log(`serviceWorker`, `cleaning up unused epub archive reference (after 5mn)`)
    archive = undefined
    lastUrl = undefined
  }
}, 5 * 60 * 1000)

export const loadEpub = async (url: string) => {
  if (url !== lastUrl) {
    archive = undefined
    loading = false
  }
  if (archive) {
    return archive
  }
  if (loading) {
    return new Promise<Archive>(resolve => {
      setTimeout(async () => {
        resolve(await loadEpub(url))
      }, 100)
    })
  }
  loading = true
  archive = undefined
  const response = await fetch(url)

  if (url.endsWith(`.txt`)) {
    const content = await response.text()
    archive = await createArchiveFromText(content)
  } else {
    const epubData = await response.blob()
    const jszip = await loadAsync(epubData)
    archive = await createArchiveFromJszip(jszip, { orderByAlpha: true })
  }

  lastUrl = url
  loading = false

  return archive
}