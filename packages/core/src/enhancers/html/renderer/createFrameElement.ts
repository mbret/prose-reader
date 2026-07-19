export const createFrameElement = (ownerDocument: Document) => {
  // The iframe must be created directly in the mount document. Creating it in
  // another document and then adopting it (via appendChild) reloads the frame,
  // so the caller passes the document the frame will live in.
  const frame = ownerDocument.createElement(`iframe`)
  frame.frameBorder = `no`
  frame.tabIndex = 0
  frame.setAttribute(
    `sandbox`,
    `
  allow-same-origin 
  allow-scripts 
  allow-top-navigation-to-custom-protocols
`,
  )
  frame.style.cssText = `
  overflow: hidden;
  background-color: transparent;
  border: 0px none transparent;
  padding: 0px;
`

  frame.setAttribute(`role`, `main`)

  return frame
}
