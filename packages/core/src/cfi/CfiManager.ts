import type { Manifest } from "@prose-reader/shared"
import type { HookManager } from "../hooks/HookManager.ts"
import type { PageEntry } from "../spine/Pages.ts"
import type { SpineItemsManager } from "../spine/SpineItemsManager.ts"
import { getSpineItemPageIndexFromNode } from "../spineItem/nodeLocation.ts"
import {
  generateCfiForSpineItemPage as generateBaseCfiForSpineItemPage,
  generateCfiFromRange as generateBaseCfiFromRange,
  generateRootCfi as generateBaseRootCfi,
} from "./generate.ts"
import {
  isRootCfi,
  type ProseParsedCfi,
  parseCfi as parseBaseCfi,
} from "./parse.ts"
import { resolveCfi as resolveBaseCfi } from "./resolve.ts"

export type CfiGenerateHookParams = {
  cfi: string
  spineItem: Manifest["spineItems"][number]
}

export type CfiResolveHookParams = {
  cfi: string
}

export type CfiTransformHook<Params extends { cfi: string }> = (
  params: Params,
) => string | undefined

export class CfiManager {
  public constructor(
    private hookManager: HookManager,
    private spineItemsManager: SpineItemsManager,
  ) {}

  public transformForResolve = (cfi: string) => {
    const { finalParams } = this.hookManager.executeSequential(
      "cfi.beforeResolve",
      { cfi },
      (params, transformedCfi) => ({
        cfi: transformedCfi ?? params.cfi,
      }),
    )

    return finalParams.cfi
  }

  public parseCfi = (cfi: string): ProseParsedCfi & { offset: number } => {
    return parseBaseCfi(this.transformForResolve(cfi))
  }

  /**
   * The spine item a cfi names, `undefined` when it names none: an item the
   * book does not have, or a cfi that can't be read, which names nothing.
   */
  public getSpineItemFromCfi = (cfi: string) => {
    try {
      return this.spineItemsManager.get(this.parseCfi(cfi).itemIndex)
    } catch {
      return undefined
    }
  }

  public isRootCfi = (cfi: string) => {
    return isRootCfi(cfi)
  }

  /**
   * The page of its spine item a cfi is on, when it can be known now. A
   * pre-paginated item has one page, and a cfi naming only its item is at the
   * item's start: both are on page 0 at once. Any other cfi is on the page of
   * the node it resolves to, while its item is loaded and laid out. It is
   * `undefined` otherwise, as for a cfi that does not resolve in its item.
   */
  public getSpineItemPageIndexFromCfi = (cfi: string) => {
    const spineItem = this.getSpineItemFromCfi(cfi)

    if (!spineItem) return undefined

    if (spineItem.renditionLayout === `pre-paginated` || this.isRootCfi(cfi)) {
      return 0
    }

    if (!spineItem.value.isReady) return undefined

    const { node, offset } = this.resolveCfi({ cfi })

    return node
      ? getSpineItemPageIndexFromNode(node, offset ?? 0, spineItem)
      : undefined
  }

  public generateRootCfi = (item: Manifest["spineItems"][number]) => {
    return this.transformGeneratedCfi({
      cfi: generateBaseRootCfi(item),
      spineItem: item,
    })
  }

  public generateCfiForSpineItemPage = ({
    spineItem,
    pageNode,
  }: {
    spineItem: Manifest["spineItems"][number]
    pageNode: NonNullable<PageEntry["firstVisibleNode"]>
  }) => {
    return this.transformGeneratedCfi({
      cfi: generateBaseCfiForSpineItemPage({ spineItem, pageNode }),
      spineItem,
    })
  }

  /**
   * The cfi of a page's first visible character, or of its item when the page
   * has no resolvable first visible node.
   */
  public generateCfiForPage = (
    spineItem: Manifest["spineItems"][number],
    page: PageEntry,
  ) => {
    return page.firstVisibleNode
      ? this.generateCfiForSpineItemPage({
          spineItem,
          pageNode: page.firstVisibleNode,
        })
      : this.generateRootCfi(spineItem)
  }

  public generateCfiFromRange = (
    range: Range,
    item: Manifest[`spineItems`][number],
  ) => {
    return this.transformGeneratedCfi({
      cfi: generateBaseCfiFromRange(range, item),
      spineItem: item,
    })
  }

  public resolveCfi = (
    params: Omit<Parameters<typeof resolveBaseCfi>[0], "spineItemsManager">,
  ) => {
    return resolveBaseCfi({
      ...params,
      cfi: this.transformForResolve(params.cfi),
      spineItemsManager: this.spineItemsManager,
    })
  }

  private transformGeneratedCfi(params: CfiGenerateHookParams) {
    const { finalParams } = this.hookManager.executeSequential(
      "cfi.afterGenerate",
      params,
      (currentParams, transformedCfi) => ({
        ...currentParams,
        cfi: transformedCfi ?? currentParams.cfi,
      }),
    )

    return finalParams.cfi
  }
}
