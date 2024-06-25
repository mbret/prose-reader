const IFRAME_EVENT_BRIDGE_ELEMENT_ID = `proseReaderIframeEventBridgeElement`

export const createIframeEventBridgeElement = (container: HTMLElement) => {
  const iframeEventBridgeElement = container.ownerDocument.createElement(`div`)
  iframeEventBridgeElement.id = IFRAME_EVENT_BRIDGE_ELEMENT_ID
  iframeEventBridgeElement.style.cssText = `
      position: absolute;
      height: 100%;
      width: 100%;
      top: 0;
      left: 0;
      z-index: -1;
    `

  return iframeEventBridgeElement
}
