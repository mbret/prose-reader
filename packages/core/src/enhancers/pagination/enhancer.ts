import { takeUntil } from "rxjs"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { trackPaginationInfo } from "./pagination"
import { ResourcesLocator } from "./ResourcesLocator"
import type { PaginationEnhancerAPI } from "./types"

export type { EnhancerPaginationInto, PaginationEnhancerAPI } from "./types"

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<RootEnhancer> & LayoutEnhancerOutput,
    PaginationOutput extends PaginationEnhancerAPI<InheritOutput>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): PaginationOutput => {
    const reader = next(options)

    const { paginationInfo$, getPaginationInfo } = trackPaginationInfo(reader)

    paginationInfo$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    const resourcesLocator = new ResourcesLocator(reader)

    return {
      ...reader,
      locateResource: resourcesLocator.locateResource.bind(resourcesLocator),
      pagination: {
        ...reader.pagination,
        get state() {
          return getPaginationInfo()
        },
        get state$() {
          return paginationInfo$
        },
      },
    } as unknown as PaginationOutput
  }
