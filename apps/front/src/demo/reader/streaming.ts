/**
 * Some books cannot be manipulated through the service worker: pdfjs cannot
 * hand back serialized resources, so those are streamed on the client and do
 * not wait for the worker to take control.
 */
export const isClientStreamedBook = (epubKey: string) =>
  atob(epubKey).endsWith(`.pdf`)
