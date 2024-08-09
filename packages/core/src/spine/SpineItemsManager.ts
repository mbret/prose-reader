import { BehaviorSubject, Subject } from "rxjs"
import { tap, takeUntil } from "rxjs/operators"
import { Report } from "../report"
import { Context } from "../context/Context"
import { SpineItem } from "../spineItem/createSpineItem"
import { isShallowEqual } from "../utils/objects"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { extractProseMetadataFromCfi } from "../cfi/lookup/extractProseMetadataFromCfi"
import { DestroyableClass } from "../utils/DestroyableClass"

const NAMESPACE = `spineItemsManager`

export class SpineItemsManager extends DestroyableClass {
  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
  ) {
    super()
  }

  protected layoutSubject = new Subject<boolean>()

  /**
   * This contains every item dimension / position on the viewport.
   * This is only used to avoid intensively request bounding of each items later.
   * This is always in sync with every layout since it is being updated for every layout
   * done with the manager.
   */
  protected itemLayoutInformation: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }[] = []

  protected orderedSpineItemsSubject = new BehaviorSubject<SpineItem[]>([])

  public items$ = this.orderedSpineItemsSubject.asObservable()
  public layout$ = this.layoutSubject.asObservable()

  /**
   * @todo
   * move this logic to the spine
   *
   * @todo
   * make sure to check how many times it is being called and try to reduce number of layouts
   * it is called eery time an item is being unload (which can adds up quickly for big books)
   */
  layout() {
    const manifest = this.context.manifest
    const newItemLayoutInformation: typeof this.itemLayoutInformation = []
    const isGloballyPrePaginated = manifest?.renditionLayout === `pre-paginated`

    this.orderedSpineItemsSubject.value.reduce(
      ({ horizontalOffset, verticalOffset }, item, index) => {
        let minimumWidth = this.context.getPageSize().width
        let blankPagePosition: `none` | `before` | `after` = `none`
        const itemStartOnNewScreen =
          horizontalOffset % this.context.state.visibleAreaRect.width === 0
        const isLastItem =
          index === this.orderedSpineItemsSubject.value.length - 1

        if (this.context.state.isUsingSpreadMode) {
          /**
           * for now every reflowable content that has reflow siblings takes the entire screen by default
           * this simplify many things and I am not sure the specs allow one reflow
           * to end and an other one to start on the same screen anyway
           *
           * @important
           * For now this is impossible to have reflow not taking all screen. This is because
           * when an element is unloaded, the next element will move back its x axis, then an adjustment
           * will occurs and the previous element will become visible again, meaning it will be loaded,
           * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
           * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
           * book with spread on to make it work.
           *
           * @important
           * When the book is globally pre-paginated we will not apply any of this even if each item is
           * reflowable. This is mostly a publisher mistake but does not comply with spec. Therefore
           * we ignore it
           */
          if (
            !isGloballyPrePaginated &&
            item.item.renditionLayout === `reflowable` &&
            !isLastItem
          ) {
            minimumWidth = this.context.getPageSize().width * 2
          }

          // mainly to make loading screen looks good
          if (
            !isGloballyPrePaginated &&
            item.item.renditionLayout === `reflowable` &&
            isLastItem &&
            itemStartOnNewScreen
          ) {
            minimumWidth = this.context.getPageSize().width * 2
          }

          const lastItemStartOnNewScreenInAPrepaginatedBook =
            itemStartOnNewScreen && isLastItem && isGloballyPrePaginated

          if (
            item.item.pageSpreadRight &&
            itemStartOnNewScreen &&
            !this.context.isRTL()
          ) {
            blankPagePosition = `before`
            minimumWidth = this.context.getPageSize().width * 2
          } else if (
            item.item.pageSpreadLeft &&
            itemStartOnNewScreen &&
            this.context.isRTL()
          ) {
            blankPagePosition = `before`
            minimumWidth = this.context.getPageSize().width * 2
          } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
            if (this.context.isRTL()) {
              blankPagePosition = `before`
            } else {
              blankPagePosition = `after`
            }
            minimumWidth = this.context.getPageSize().width * 2
          }
        }

        // we trigger an item layout which will update the visual and return
        // us with the item new eventual layout information.
        // This step is not yet about moving item or adjusting position.
        const { width, height } = item.layout({
          minimumWidth,
          blankPagePosition,
          spreadPosition: this.context.state.isUsingSpreadMode
            ? itemStartOnNewScreen
              ? this.context.isRTL()
                ? `right`
                : `left`
              : this.context.isRTL()
                ? `left`
                : `right`
            : `none`,
        })

        if (this.settings.settings.computedPageTurnDirection === `vertical`) {
          const currentValidEdgeYForVerticalPositioning = itemStartOnNewScreen
            ? verticalOffset
            : verticalOffset - this.context.state.visibleAreaRect.height
          const currentValidEdgeXForVerticalPositioning = itemStartOnNewScreen
            ? 0
            : horizontalOffset

          if (this.context.isRTL()) {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          } else {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          }

          const newEdgeX = width + currentValidEdgeXForVerticalPositioning
          const newEdgeY = height + currentValidEdgeYForVerticalPositioning

          newItemLayoutInformation.push({
            left: currentValidEdgeXForVerticalPositioning,
            right: newEdgeX,
            top: currentValidEdgeYForVerticalPositioning,
            bottom: newEdgeY,
            height,
            width,
          })

          return {
            horizontalOffset: newEdgeX,
            verticalOffset: newEdgeY,
          }
        }

        // We can now adjust the position of the item if needed based on its new layout.
        // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
        // it will be x from right
        item.adjustPositionOfElement(
          this.context.isRTL()
            ? { right: horizontalOffset, top: 0 }
            : { left: horizontalOffset, top: 0 },
        )

        newItemLayoutInformation.push({
          ...(this.context.isRTL()
            ? {
                left:
                  this.context.state.visibleAreaRect.width -
                  horizontalOffset -
                  width,
                right:
                  this.context.state.visibleAreaRect.width - horizontalOffset,
              }
            : {
                left: horizontalOffset,
                right: horizontalOffset + width,
              }),
          top: verticalOffset,
          bottom: height,
          height,
          width,
        })

        return {
          horizontalOffset: horizontalOffset + width,
          verticalOffset: 0,
        }
      },
      { horizontalOffset: 0, verticalOffset: 0 },
    )

    const hasLayoutChanges =
      this.itemLayoutInformation.length !== newItemLayoutInformation.length ||
      this.itemLayoutInformation.some(
        (old, index) => !isShallowEqual(old, newItemLayoutInformation[index]),
      )

    this.itemLayoutInformation = newItemLayoutInformation

    Report.log(NAMESPACE, `layout`, {
      hasLayoutChanges,
      itemLayoutInformation: this.itemLayoutInformation,
    })

    this.layoutSubject.next(hasLayoutChanges)
  }

  get(indexOrId: number | string | SpineItem | undefined) {
    if (typeof indexOrId === `number`) {
      return this.orderedSpineItemsSubject.value[indexOrId]
    }

    if (typeof indexOrId === `string`) {
      return this.orderedSpineItemsSubject.value.find(
        ({ item }) => item.id === indexOrId,
      )
    }

    return indexOrId
  }

  /**
   * It's important to not use x,y since we need the absolute position of each element. Otherwise x,y would be relative to
   * current window (viewport).
   */
  getAbsolutePositionOf(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    const fallback = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }

    const spineItem = this.get(spineItemOrIndex)

    const indexOfItem = spineItem
      ? this.orderedSpineItemsSubject.value.indexOf(spineItem)
      : -1

    const layoutInformation = this.itemLayoutInformation[indexOfItem]

    return layoutInformation || fallback
  }

  comparePositionOf(toCompare: SpineItem, withItem: SpineItem) {
    const toCompareIndex = this.getSpineItemIndex(toCompare) ?? 0
    const withIndex = this.getSpineItemIndex(withItem) ?? 0

    return toCompareIndex > withIndex
      ? `after`
      : toCompareIndex === withIndex
        ? `same`
        : `before`
  }

  getSpineItemIndex(spineItem: SpineItem | undefined) {
    if (!spineItem) return undefined
    const index = this.orderedSpineItemsSubject.value.indexOf(spineItem)

    return index < 0 ? undefined : index
  }

  addMany(spineItems: SpineItem[]) {
    this.orderedSpineItemsSubject.next([
      ...this.orderedSpineItemsSubject.getValue(),
      ...spineItems,
    ])

    spineItems.forEach((spineItem) => {
      spineItem.$.contentLayout$
        .pipe(takeUntil(this.context.destroy$))
        .subscribe(() => {
          // upstream change, meaning we need to layout again to both resize correctly each item but also to
          // adjust positions, etc
          this.layout()
        })

      spineItem.$.loaded$
        .pipe(
          tap(() => {
            if (spineItem.isUsingVerticalWriting()) {
              this.context.update({
                hasVerticalWriting: true,
              })
            } else {
              this.context.update({
                hasVerticalWriting: false,
              })
            }
          }),
          takeUntil(this.context.destroy$),
        )
        .subscribe()
    })
  }

  getAll() {
    return this.orderedSpineItemsSubject.value
  }

  getLength() {
    return this.orderedSpineItemsSubject.value.length
  }

  getSpineItemFromCfi(cfi: string) {
    const { itemId } = extractProseMetadataFromCfi(cfi)

    if (itemId) {
      const { itemId } = extractProseMetadataFromCfi(cfi)
      const spineItem = (itemId ? this.get(itemId) : undefined) || this.get(0)

      return spineItem
    }

    return undefined
  }

  /**
   * @todo handle reload, remove subscription to each items etc. See add()
   */
  destroyItems() {
    this.orderedSpineItemsSubject.value.forEach((item) => item.destroy())
  }

  destroy() {
    super.destroy()

    this.layoutSubject.complete()
  }
}
