interface TreeNode {
  [key: string]: TreeNode
}

export const printTree = (paths: string[]): string => {
  // Split and collect all parts for tree reconstruction
  const tree: TreeNode = {}
  for (const path of paths) {
    const parts = path.split("/")
    let node = tree
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part === undefined) continue
      if (!node[part]) {
        node[part] = {}
      }
      node = node[part]
    }
  }

  // Recursively build the tree string
  const render = (node: TreeNode, indent = ""): string => {
    return Object.keys(node)
      .sort()
      .map((key, i, arr) => {
        const isLast = i === arr.length - 1
        const prefix = indent + (isLast ? "└── " : "├── ")
        const nextIndent = indent + (isLast ? "    " : "│   ")
        const value = node[key]
        if (value && Object.keys(value).length > 0) {
          return `${prefix}${key}/\n${render(value, nextIndent)}`
        }
        return `${prefix}${key}`
      })
      .join("\n")
  }

  return render(tree)
}
