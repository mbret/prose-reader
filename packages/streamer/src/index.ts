import xmldoc from 'xmldoc'
export { getResourceFromArchive } from './generators/resources'
export { getManifestFromArchive } from './generators/manifest'
export type { Manifest } from '@prose-reader/shared'
export { Report } from './report'
export { Archive } from './archives/types'
export { getArchiveOpfInfo } from './archives/getArchiveOpfInfo'
export { createArchiveFromUrls } from './archives/createArchiveFromUrls'
export { createArchiveFromText } from './archives/createArchiveFromText'
export { createArchiveFromJszip } from './archives/createArchiveFromJszip'
export { createArchiveFromArrayBufferList } from './archives/createArchiveFromArrayBufferList'

export {
  xmldoc
}
