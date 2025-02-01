import { type Observable, takeUntil } from "rxjs"
import type { PaginationInfo } from "../../pagination/Pagination"
import { Report } from "../../report"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { NAMESPACE } from "./constants"
import {
  type ConsolidatedResource,
  type LocatableResource,
  createLocator,
} from "./locate"
import { trackPaginationInfo } from "./pagination"
import type { ExtraPaginationInfo } from "./types"

const report = Report.namespace(NAMESPACE)

void report

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
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
      ) => Observable<(ConsolidatedResource & T)[]>
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
        ) => Observable<(ConsolidatedResource & T)[]>
      },
    }
  }
