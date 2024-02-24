import { Reader, Report } from "@prose-reader/core"
import { merge, takeUntil, tap } from "rxjs"

const report = Report.namespace(`@prose-reader/debug`)

export const debugEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
    { enable }: { enable: boolean },
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    if (!enable) return reader

    merge(
      reader.$.state$.pipe(
        tap((state) => {
          report.log(`reader.$.state$`, state)
        }),
      ),
      reader.pagination$.pipe(
        tap((state) => {
          report.log(`reader.pagination$`, state)
        }),
      ),
    )
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return reader
  }
