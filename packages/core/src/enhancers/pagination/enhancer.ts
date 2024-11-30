import { Observable, takeUntil } from "rxjs"
import { progressionEnhancer } from "../progression"
import { Report } from "../../report"
import { EnhancerOutput } from "../types/enhancer"
import { PaginationInfo } from "../../pagination/Pagination"
import { ExtraPaginationInfo } from "./types"
import { trackPaginationInfo } from "./pagination"
import { NAMESPACE } from "./constants"
import {
  ConsolidatedResource,
  createLocator,
  LocatableResource,
} from "./locate"

type ProgressionEnhancer = typeof progressionEnhancer

const report = Report.namespace(NAMESPACE)

void report

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<ProgressionEnhancer>,
    PaginationOutput extends Omit<
      InheritOutput["pagination"],
      "state$" | "state"
    > & {
      state$: Observable<PaginationInfo & ExtraPaginationInfo>
      state: PaginationInfo & ExtraPaginationInfo
    },
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): Omit<InheritOutput, "pagination"> & {
    pagination: PaginationOutput & {
      locate: <T extends LocatableResource>(
        resources: T[],
      ) => Observable<{ isStale: boolean; data: (ConsolidatedResource & T)[] }>
    }
  } => {
    const reader = next(options)

    const { paginationInfo$, getPaginationInfo } = trackPaginationInfo(reader)

    paginationInfo$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    const locate = createLocator(reader)

    return {
      ...reader,
      pagination: {
        ...reader.pagination,
        getState: () => getPaginationInfo(),
        state$: paginationInfo$,
        locate,
      } as unknown as PaginationOutput & {
        locate: <T extends LocatableResource>(
          resources: T[],
        ) => Observable<{
          isStale: boolean
          data: (ConsolidatedResource & T)[]
        }>
      },
    }
  }
