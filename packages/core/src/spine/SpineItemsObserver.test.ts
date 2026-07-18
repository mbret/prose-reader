import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"

/**
 * Mirrors the spec behavior this suite relies on: an observation only
 * delivers entries for elements that are connected and rendered (a detached
 * element has no box). Deliveries are triggered manually via
 * `deliverToConnectedElements`.
 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []

  static deliverToConnectedElements() {
    FakeResizeObserver.instances.forEach((instance) => {
      instance.observed.forEach((element) => {
        if (element.isConnected) {
          instance.callback(
            // biome-ignore lint/suspicious/noExplicitAny: minimal entry, only `target` is consumed
            [{ target: element } as any],
            // biome-ignore lint/suspicious/noExplicitAny: fake observer
            instance as any,
          )
        }
      })
    })
  }

  static get observedElements() {
    return FakeResizeObserver.instances.flatMap(({ observed }) => observed)
  }

  observed: Element[] = []

  constructor(private callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }

  unobserve() {}

  disconnect() {
    this.observed = []
  }
}

const createTestEnvironment = () => {
  const context = new Context(
    createTestManifest({
      spineItems: createTestManifestSpineItems(2),
    }),
  )
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(
    context,
    settings,
    hookManager,
    viewport,
  )
  const spineItemsObserver = new SpineItemsObserver(spineItemsManager)

  return { spineItemsManager, spineItemsObserver }
}

describe("itemResize$", () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
    vi.stubGlobal("ResizeObserver", FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should observe every item on subscription but emit only once items are attached", () => {
    const { spineItemsManager, spineItemsObserver } = createTestEnvironment()
    const emissions: Array<{ item: SpineItem }> = []

    const subscription = spineItemsObserver.itemResize$.subscribe((value) => {
      emissions.push(value)
    })

    // observation starts right away, on the still detached elements, so a
    // real ResizeObserver reports them as soon as they get attached at mount
    expect(FakeResizeObserver.observedElements).toEqual(
      spineItemsManager.items.map((item) => item.element),
    )
    // detached elements have no box, nothing is reported yet
    expect(emissions).toEqual([])

    const parent = document.createElement("div")
    document.body.appendChild(parent)
    spineItemsManager.items.forEach((item) => {
      item.attach(parent)
    })

    FakeResizeObserver.deliverToConnectedElements()

    expect(emissions.length).toBe(2)
    expect(emissions[0]?.item).toBe(spineItemsManager.items[0])
    expect(emissions[1]?.item).toBe(spineItemsManager.items[1])

    subscription.unsubscribe()
    parent.remove()
  })
})
