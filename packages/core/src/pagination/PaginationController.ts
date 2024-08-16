import {
  animationFrameScheduler,
  filter,
  merge,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { Context } from "../context/Context"
import { Pagination } from "./Pagination"
import { SpineItemsManager } from "../spine/SpineItemsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import { createSpineItemLocator } from "../spineItem/locationResolver"
import { getRootCfi } from "../cfi/generate/getRootCfi"
import { isRootCfi } from "../cfi/lookup/isRootCfi"
import { Spine } from "../spine/Spine"
import { SpineItem } from "../spineItem/createSpineItem"
import { ViewportPosition } from "../navigation/viewport/ViewportNavigator"
import { generateCfiForSpineItemPage } from "../cfi/generate/generateCfiForSpineItemPage"

export class PaginationController extends DestroyableClass {
  constructor(
    protected context: Context,
    protected pagination: Pagination,
    protected spineItemsManager: SpineItemsManager,
    protected spine: Spine,
    protected spineItemLocator: ReturnType<typeof createSpineItemLocator>,
  ) {
    super()

    /**
     * Adjust heavier pagination once the navigation and items are updated.
     * This is also cancelled if the layout changes, because the layout will
     * trigger a new navigation adjustment and pagination again.
     *
     * This adjustment is used to update the pagination with the most up to date values we can.
     * It needs to be ran only when viewport is free because some operation such as looking up cfi can
     * be really heavy.
     *
     * The cfi will only be updated if it needs to be:
     * - cfi is a root target
     * - cfi is undefined
     * - items are different
     */
    const updatePagination$ = merge(
      this.context.bridgeEvent.navigation$,
      spine.spineLayout.layout$.pipe(filter(({ hasChanged }) => hasChanged)),
    ).pipe(
      switchMap(() => {
        const getVisiblePagesFromViewportPosition = ({
          spineItem,
          position,
        }: {
          spineItem: SpineItem
          position: ViewportPosition
        }) =>
          this.spine.locator.getVisiblePagesFromViewportPosition({
            spineItem: spineItem,
            position,
            threshold: 0.5,
          })

        /**
         * @important
         *
         * It's important to soft update pagination immediatly.
         * This will avoid delay in potential user feedbacks (navigation buttons).
         *
         * However we wait for the navigator to be unlocked, this avoid updating the pagination
         * while the user is panning for exemple. We consider a locked navigator as unfinished
         * navigation.
         *
         * Nothing here should be heavier than layout lookup.
         */
        return this.context.bridgeEvent.navigationUnlocked$.pipe(
          take(1),
          withLatestFrom(this.context.bridgeEvent.navigation$),
          tap(([, navigation]) => {
            const { position } = navigation
            const previousPagination = this.pagination.state

            const {
              beginIndex: beginSpineItemIndex,
              endIndex: endSpineItemIndex,
            } =
              this.spine.locator.getVisibleSpineItemsFromPosition({
                position,
                threshold: 0.5,
              }) ?? {}

            const beginSpineItem =
              this.spineItemsManager.get(beginSpineItemIndex)
            const endSpineItem = this.spineItemsManager.get(endSpineItemIndex)

            if (!beginSpineItem || !endSpineItem) return

            const beginLastCfi = previousPagination.beginCfi
            const endLastCfi = previousPagination.endCfi

            const { beginPageIndex = 0 } =
              getVisiblePagesFromViewportPosition({
                spineItem: beginSpineItem,
                position,
              }) ?? {}

            const { endPageIndex = 0 } =
              getVisiblePagesFromViewportPosition({
                spineItem: endSpineItem,
                position,
              }) ?? {}

            const shouldUpdateBeginCfi =
              beginLastCfi === undefined ||
              isRootCfi(beginLastCfi) ||
              previousPagination.beginSpineItemIndex !== beginSpineItemIndex

            const shouldUpdateEndCfi =
              previousPagination.endSpineItemIndex !== endSpineItemIndex ||
              endLastCfi === undefined ||
              isRootCfi(endLastCfi)

            const beginCfi = shouldUpdateBeginCfi
              ? getRootCfi(beginSpineItem)
              : beginLastCfi

            const endCfi = shouldUpdateEndCfi
              ? getRootCfi(endSpineItem)
              : endLastCfi

            const beginSpineItemDimensions =
              beginSpineItem.getElementDimensions()

            const beginNumberOfPagesInSpineItem =
              this.spineItemLocator.getSpineItemNumberOfPages({
                itemHeight: beginSpineItemDimensions.height,
                itemWidth: beginSpineItemDimensions.width,
                isUsingVerticalWriting:
                  !!beginSpineItem.isUsingVerticalWriting(),
              })

            const endSpineItemDimensions = endSpineItem.getElementDimensions()

            const endNumberOfPagesInSpineItem =
              this.spineItemLocator.getSpineItemNumberOfPages({
                itemHeight: endSpineItemDimensions.height,
                itemWidth: endSpineItemDimensions.width,
                isUsingVerticalWriting: !!endSpineItem.isUsingVerticalWriting(),
              })

            this.pagination.update({
              beginCfi,
              beginNumberOfPagesInSpineItem,
              beginPageIndexInSpineItem: beginPageIndex,
              beginSpineItemIndex,
              endCfi,
              endNumberOfPagesInSpineItem,
              endPageIndexInSpineItem: endPageIndex,
              endSpineItemIndex,
              navigationId: navigation.id,
            })
          }),
        )
      }),
    )

    /**
     * Heavy operation, needs to be optimized as much as possible.
     *
     * @todo add more optimisation, comparing item before, after with position, etc
     */
    const updateCfi$ = updatePagination$.pipe(
      switchMap(() => this.context.bridgeEvent.viewportState$),
      filter((state) => state === "free"),
      switchMap(() => timer(500, animationFrameScheduler)),
      tap(() => {
        const {
          beginSpineItemIndex,
          endSpineItemIndex,
          beginPageIndexInSpineItem,
          endPageIndexInSpineItem,
        } = this.pagination.state

        if (
          beginPageIndexInSpineItem === undefined ||
          endPageIndexInSpineItem === undefined ||
          beginSpineItemIndex === undefined ||
          endSpineItemIndex === undefined
        )
          return

        const beginSpineItem = this.spineItemsManager.get(beginSpineItemIndex)
        const endSpineItem = this.spineItemsManager.get(endSpineItemIndex)

        if (beginSpineItem === undefined || endSpineItem === undefined) return

        // @todo only update long cfi if the item layout change but specifically its content
        this.pagination.update({
          beginCfi: generateCfiForSpineItemPage({
            pageIndex: beginPageIndexInSpineItem,
            spineItem: beginSpineItem,
            spineItemLocator,
          }),
          endCfi: generateCfiForSpineItemPage({
            pageIndex: endPageIndexInSpineItem,
            spineItem: endSpineItem,
            spineItemLocator,
          }),
        })
      }),
    )

    merge(updatePagination$, updateCfi$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }
}
