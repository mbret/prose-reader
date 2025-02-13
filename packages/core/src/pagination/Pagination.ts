import { BehaviorSubject, distinctUntilChanged, share, tap } from "rxjs"
import type { Context } from "../context/Context"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { DestroyableClass } from "../utils/DestroyableClass"

const NAMESPACE = `pagination`

const report = Report.namespace(NAMESPACE)

export type PaginationInfo = {
  beginPageIndexInSpineItem: number | undefined
  beginNumberOfPagesInSpineItem: number
  beginCfi: string | undefined
  beginSpineItemIndex: number | undefined
  endPageIndexInSpineItem: number | undefined
  endNumberOfPagesInSpineItem: number
  endCfi: string | undefined
  endSpineItemIndex: number | undefined
  navigationId?: symbol
}

export class Pagination extends DestroyableClass {
  protected paginationSubject = new BehaviorSubject<PaginationInfo>({
    beginPageIndexInSpineItem: undefined,
    beginNumberOfPagesInSpineItem: 0,
    beginCfi: undefined,
    beginSpineItemIndex: undefined,
    endPageIndexInSpineItem: undefined,
    endNumberOfPagesInSpineItem: 0,
    endCfi: undefined,
    endSpineItemIndex: undefined,
    navigationId: undefined,
  })

  public state$ = this.paginationSubject.pipe(
    distinctUntilChanged(isShallowEqual),
    tap((value) => {
      report.info(`update`, value)
    }),
    share(),
  )

  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
  ) {
    super()
  }

  public update(pagination: Partial<PaginationInfo>) {
    this.paginationSubject.next({
      ...this.paginationSubject.value,
      ...pagination,
    })
  }

  get state() {
    return this.paginationSubject.value
  }

  destroy() {
    super.destroy()

    this.paginationSubject.complete()
  }
}
