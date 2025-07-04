import type { Manifest } from "@prose-reader/shared"
import type { Viewport } from "../../viewport/Viewport"
import { CONTAINER_HTML_PREFIX } from "./constants"

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
export const createLoadingElementContainer = (
  containerElement: HTMLElement,
  viewport: Viewport,
) => {
  const loadingElement = containerElement.ownerDocument.createElement(`div`)
  loadingElement.classList.add(CONTAINER_HTML_PREFIX)
  loadingElement.style.cssText = `
      height: 100%;
      width: 100%;
      max-width: ${viewport.absoluteViewport.width}px;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      position: absolute;
      left: 0;
      top: 0;
      color: rgb(202, 202, 202);
      background-color: white;
      z-index: 1;
    `

  return loadingElement
}

export const defaultLoadingElementCreate = ({
  container,
  item,
}: {
  container: HTMLElement
  item: Manifest[`spineItems`][number]
}) => {
  const logoElement = container.ownerDocument.createElement(`div`)
  logoElement.innerText = `prose`
  logoElement.style.cssText = `
      font-size: 4em;
    `
  const detailsElement = container.ownerDocument.createElement(`div`)
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
      font-size: 1.2em;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      max-width: 300px;
      width: 80%;
    `
  container.appendChild(logoElement)
  container.appendChild(detailsElement)

  return container
}
