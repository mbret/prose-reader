import {
  createReaderWithEnhancer as createReader,
  Reader,
  ExternalEnhancer as Enhancer
} from './createReaderWithEnhancer'
import { createSelection } from './selection'
export { compose } from './utils/compose'
export { ComposeEnhancer } from './enhancers/composeEnhancer'

export { Manifest } from './types'

export {
  createReader,
  Reader,
  Enhancer
}

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from './report'

export { composeEnhancer } from './enhancers/composeEnhancer'
export { groupBy, isShallowEqual } from './utils/objects'
