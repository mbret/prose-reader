/* eslint-disable @typescript-eslint/no-explicit-any */
import { layout } from "@chakra-ui/react"
import { BehaviorSubject, first, NEVER, of, Subject } from "rxjs"

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

  public layout$ = new Subject<{ width: number; height: number }>()

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
    this.items = items.map((item) => {
      const layoutSubject = new Subject<{ width: number; height: number }>()
      return {
        ...item,
        getElementDimensions: () => ({
          width: item.width,
          height: item.height,
        }),
        isUsingVerticalWriting: () => false,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        adjustPositionOfElement: () => {},
        layout$: layoutSubject,
        layout: () => {
          setTimeout(() => {
            layoutSubject.next({ width: item.width, height: item.height })
          }, 1)

          return layoutSubject.pipe(first())
        },
        contentLayout$: NEVER,
        loaded$: of(true),
        needsLayout$: NEVER,
      }
    })

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
