/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 */

/**
 * Escape special characters in a CFI string
 */
function cfiEscape(str: string): string {
  return str.replace(/[\[\]\^,();]/g, `^$&`);
}

/**
 * Generate a CFI for a node in the DOM
 */
export function generate(node: Node, offset?: number, extra?: string): string {
  let cfi = '';
  let currentNode: Node | null = node;
  
  // Build the CFI path from the node up to the html element
  while (currentNode?.parentNode) {
    const parentNode: Node = currentNode.parentNode;
    const siblings = parentNode.childNodes;
    
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