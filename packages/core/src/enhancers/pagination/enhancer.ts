import { takeUntil } from "rxjs"
import { Report } from "../../report"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { ResourcesLocator } from "./ResourcesLocator"
import { NAMESPACE } from "./constants"
import { trackPaginationInfo } from "./pagination"
import type { PaginationEnhancerAPI } from "./types"

const report = Report.namespace(NAMESPACE)

void report

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
        getState: () => getPaginationInfo(),
        state$: paginationInfo$,
      },
    } as unknown as PaginationOutput
  }
