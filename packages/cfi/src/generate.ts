/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 * Based on the EPUB CFI 1.1 specification: https://idpf.org/epub/linking/cfi/epub-cfi.html
 */

/**
 * Escape special characters in a CFI string
 * @param str The string to escape
 * @returns The escaped string
 */
function cfiEscape(str: string): string {
  return str.replace(/[\[\]\^,();]/g, `^$&`);
}

/**
 * Generate a CFI for a node in the DOM
 * @param node The DOM node to generate a CFI for
 * @param offset Optional character offset within the node
 * @param extra Optional extra information to append to the CFI
 * @returns A CFI string
 */
export function generate(node: Node, offset?: number, extra?: string): string {
  let cfi = '';
  let currentNode: Node | null = node;
  
  // Build the CFI path from the node up to the html element
  while (currentNode?.parentNode) {
    const parentNode: Node = currentNode.parentNode;
    
    // Get all child nodes, including text nodes
    const siblings = parentNode.childNodes;
    
    // Find the index of the current node among its siblings
    let index = 0;
    let found = false;
    
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === currentNode) {
        index = i;
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error('Node not found in parent\'s children');
    }
    
    // Add the node index to the CFI
    const step = index + 1;
    
    // If the node has an ID, add it to the CFI
    if (currentNode instanceof Element && currentNode.id) {
      cfi = `/${step}[${cfiEscape(currentNode.id)}]${cfi}`;
    } else {
      cfi = `/${step}${cfi}`;
    }
    
    // If we've reached the html element, stop traversing up
    if (parentNode.nodeName.toLowerCase() === 'html') {
      break;
    }
    
    currentNode = parentNode;
  }
  
  // Add the character offset if provided
  if (offset !== undefined) {
    cfi += `:${offset}`;
  }
  
  // Add any extra information
  if (extra) {
    cfi += extra;
  }
  
  // Wrap the CFI in the epubcfi() function
  return `epubcfi(${cfi})`;
}