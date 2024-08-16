export const isWithinBookmarkArea = (node: Node | EventTarget | null) =>
  node instanceof Element ? !!node.closest("[data-bookmark-area]") : false
