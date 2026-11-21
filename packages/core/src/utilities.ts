export type {
  BookBoundaryReachedEvent,
  BookBoundaryReachedOptions,
} from "./enhancers/navigation/bookBoundary.ts"
export { observeBookBoundaryReached } from "./enhancers/navigation/bookBoundary.ts"
export * from "./navigation/operators.ts"
export {
  getNextNodeInDocumentOrder,
  injectCSS,
  isHtmlElement,
  isHtmlTagElement,
  removeAttributeIfPresent,
  removeStylePropertyIfPresent,
  setAttributeIfChanged,
  setPropertyIfChanged,
  setStylePropertyIfChanged,
} from "./utils/dom.ts"
