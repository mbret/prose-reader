import type { Manifest } from "@prose-reader/shared"
import { CfiHandler } from "../CfiHandler"
import { generate, parse, resolve } from "@prose-reader/cfi"
// @ts-ignore
import epubCfiResolver from "../epub-cfi-resolver"
import { fromElements, parse as foliateParse } from "../foliate"
import { getItemAnchor } from "./getItemAnchor"

export const generateCfi = (
  node: Node,
  offset: number,
  item: Manifest["spineItems"][number],
) => {
  // because the current cfi library does not works well with offset we are just using custom
  // format and do it manually after resolving the node
  // @see https://github.com/fread-ink/epub-cfi-resolver/issues/8
  const offsetAnchor = `[prose~offset~${offset || 0}]`

  const cfi = CfiHandler.generate(
    node,
    offset,
    `${getItemAnchor(item)}|${offsetAnchor}`,
  )

  const newCfi = generate(
    { node, offset },
    {
      extensions: {
        "vnd.prose.anchor": item.index.toString(),
      },
    },
  )

  // console.log("FOOO", resolve("epubcfi(/2/4/4[toc]/4/8/4/2/4/2/2/1|[prose~anchor~3]|[prose~offset~0])", node.ownerDocument!))

  console.log(
    node,
    offset,
    node === node.ownerDocument,
    node.ownerDocument === null,
    node.ownerDocument?.documentElement === null ||
      !node.ownerDocument?.documentElement,
  )

  if (
    !node.ownerDocument ||
    !node.ownerDocument?.documentElement ||
    node === node.ownerDocument
  )
    return cfi

  const foliateCfi = fromElements([node])[0]

  console.warn("core", cfi, resolve(cfi, node.ownerDocument!))
  console.warn("cfi", newCfi, parse(newCfi), resolve(newCfi, node.ownerDocument!))
  console.warn(
    "epubCfiResolver",
    epubCfiResolver.generate(node, offset),
    epubCfiResolver.toParsed(epubCfiResolver.generate(node, offset)),
    resolve(epubCfiResolver.generate(node, offset), node.ownerDocument!),
  )
  console.warn(
    "foliate",
    foliateCfi,
    foliateParse(foliateCfi),
    resolve(fromElements([node])[0], node.ownerDocument!),
  )

  return newCfi
}
