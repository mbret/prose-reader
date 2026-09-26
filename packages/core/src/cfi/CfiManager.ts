import type { Manifest } from "@prose-reader/shared"
import type { HookManager } from "../hooks/HookManager"
import type { PageEntry } from "../spine/Pages"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import {
  generateCfiForSpineItemPage as generateBaseCfiForSpineItemPage,
  generateCfiFromRange as generateBaseCfiFromRange,
  generateRootCfi as generateBaseRootCfi,
} from "./generate"
import {
  isRootCfi,
  type ProseParsedCfi,
  parseCfi as parseBaseCfi,
} from "./parse"
import { resolveCfi as resolveBaseCfi } from "./resolve"

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
   * book does not have, or a malformed cfi, which names nothing.
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
