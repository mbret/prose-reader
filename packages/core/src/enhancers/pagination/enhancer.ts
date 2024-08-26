import { Observable, takeUntil } from "rxjs"
import { progressionEnhancer } from "../progression"
import { Report } from "../../report"
import { EnhancerOutput } from "../types/enhancer"
import { PaginationInfo } from "../../pagination/Pagination"
import { ExtraPaginationInfo } from "./types"
import { trackPaginationInfo } from "./pagination"
import { NAMESPACE } from "./constants"

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
    pagination: PaginationOutput
  } => {
    const reader = next(options)

    const { paginationInfo$, getPaginationInfo } = trackPaginationInfo(reader)

    paginationInfo$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      pagination: {
        ...reader.pagination,
        getState: () => getPaginationInfo(),
        state$: paginationInfo$,
      } as unknown as PaginationOutput,
    }
  }
