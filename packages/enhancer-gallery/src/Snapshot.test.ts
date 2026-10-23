// @vitest-environment happy-dom
import type { Reader, SpineItem } from "@prose-reader/core"
import { BehaviorSubject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Snapshot } from "./Snapshot"

const { deepCloneElement } = vi.hoisted(() => ({ deepCloneElement: vi.fn() }))

vi.mock("./utils/deepCloneElement", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./utils/deepCloneElement")>()

  deepCloneElement.mockImplementation(original.deepCloneElement)

  return { deepCloneElement }
})

const createSnapshot = () => {
  const releaseSpineItem = vi.fn()
  // Cast: a snapshot reads only a few members of the reader.
  const reader = {
    keepSpineItemLoaded: vi.fn(() => releaseSpineItem),
    viewport: { value: { pageSize: { width: 100, height: 100 } } },
    theme: { get: () => "bright" },
  } as unknown as Reader
  const isReady$ = new BehaviorSubject(false)
  const element = document.createElement("div")
  document.body.appendChild(element)
  // Cast: a snapshot reads only a few members of the item it copies.
  const item = {
    isReady$,
    element,
    layoutInfo: { width: 100, height: 100 },
    numberOfPages: 1,
  } as unknown as SpineItem
  const parent = document.createElement("div")
  document.body.appendChild(parent)

  return {
    releaseSpineItem,
    isReady$,
    parent,
    snapshot: new Snapshot(reader, item, parent, { width: 50, height: 50 }),
  }
}

describe("a snapshot", () => {
  it("releases the spine item once its copy is ready, and stays open until unsubscribed", async () => {
    const { releaseSpineItem, isReady$, snapshot, parent } = createSnapshot()
    const onComplete = vi.fn()
    const subscription = snapshot.subscribe({ complete: onComplete })

    isReady$.next(true)
    await vi.waitFor(() => expect(releaseSpineItem).toHaveBeenCalled())

    expect(onComplete).not.toHaveBeenCalled()
    expect(parent.children).toHaveLength(1)

    subscription.unsubscribe()

    expect(releaseSpineItem).toHaveBeenCalledTimes(1)
    expect(parent.children).toHaveLength(0)
  })

  it("releases the spine item when unsubscribed before the item is ready", () => {
    const { releaseSpineItem, snapshot } = createSnapshot()

    snapshot.subscribe().unsubscribe()

    expect(releaseSpineItem).toHaveBeenCalledTimes(1)
  })

  it("releases the spine item and errors when the item is destroyed before it is ready", () => {
    const { releaseSpineItem, isReady$, snapshot } = createSnapshot()
    const onError = vi.fn()
    snapshot.subscribe({ error: onError })

    isReady$.complete()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(releaseSpineItem).toHaveBeenCalledTimes(1)
  })

  it("releases the spine item and errors when the copy fails", () => {
    const { releaseSpineItem, isReady$, snapshot } = createSnapshot()
    const onError = vi.fn()
    deepCloneElement.mockImplementationOnce(() => {
      throw new Error("the copy failed")
    })
    snapshot.subscribe({ error: onError })

    isReady$.next(true)

    expect(onError).toHaveBeenCalledWith(new Error("the copy failed"))
    expect(releaseSpineItem).toHaveBeenCalledTimes(1)
  })
})
