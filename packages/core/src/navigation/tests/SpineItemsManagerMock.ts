/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, NEVER, of, Subject } from "rxjs"

export type Item = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export class SpineItemsManagerMock {
  public items: Item[] = []

  public layout$ = new Subject()

  public items$ = new BehaviorSubject<Item[]>([])

  load(
    items: {
      left: number
      top: number
      right: number
      bottom: number
      width: number
      height: number
    }[],
  ) {
    this.items = items.map((item) => ({
      ...item,
      getElementDimensions: () => ({ width: item.width, height: item.height }),
      isUsingVerticalWriting: () => false,
      adjustPositionOfElement: () => {},
      layout: () => ({ width: item.width, height: item.height }),
      $: {
        contentLayout$: NEVER,
        loaded$: of(true),
      },
    }))

    this.items$.next(this.items)
  }

  get(id: number) {
    if (typeof id === "object") return this.items.find((item) => item === id)

    return this.items[id]
  }

  getAll() {
    return this.items
  }

  getLength() {
    return this.items.length
  }

  getSpineItemIndex(item: Item) {
    return this.items.indexOf(item)
  }

  getAbsolutePositionOf(spineItem: any) {
    return (
      this.get(spineItem) ?? {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }
    )
  }
}
