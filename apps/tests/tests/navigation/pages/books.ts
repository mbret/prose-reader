/**
 * What a `beforeTapGesture` hook gets about the page of a tap, or `undefined`
 * when it gets no page.
 */
export type TappedPage =
  | {
      spineItemIndex: number
      spineItemPageIndex: number
      spineItemPagePosition: { x: number; y: number }
      pageSize: { width: number; height: number }
    }
  | undefined
