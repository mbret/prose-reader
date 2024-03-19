import { createSelection } from "./selection"

export type { Manifest } from "./types"

import { createReaderWithEnhancers } from "./createReaderWithEnhancer"
export type { RegisterHook } from "./types/Hook"

export type Reader = ReturnType<typeof createReaderWithEnhancers>

export { createReaderWithEnhancers as createReader }

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from "./report"

export { groupBy, isShallowEqual } from "./utils/objects"
