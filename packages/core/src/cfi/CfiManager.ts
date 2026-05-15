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

  public getSpineItemFromCfi = (cfi: string) => {
    const { itemIndex } = this.parseCfi(cfi)

    if (itemIndex !== undefined) {
      return this.spineItemsManager.get(itemIndex)
    }

    return undefined
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
