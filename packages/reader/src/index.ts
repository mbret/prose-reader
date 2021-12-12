import {
  createReaderWithEnhancer as createReader,
  Reader,
  ExternalEnhancer as Enhancer,
  ReaderOptions
} from './createReaderWithEnhancer'
import { createSelection } from './selection'
export { compose } from './utils/compose'
export { ComposeEnhancer2, ComposeEnhancer3, ComposeEnhancer } from './enhancers/composeEnhancer'

export { Manifest } from './types'

export {
  createReader,
  Reader,
  Enhancer,
  ReaderOptions
}

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from './report'

export { composeEnhancer } from './enhancers/composeEnhancer'
export { groupBy, isShallowEqual } from './utils/objects'
