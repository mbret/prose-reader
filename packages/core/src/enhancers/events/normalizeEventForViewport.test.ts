// @vitest-environment jsdom
// jsdom, not happy-dom: happy-dom stores an event's fields on the instance,
// where spreading it copies them. Browsers and jsdom keep them as getters on
// the prototype, where it copies none, so only jsdom copies an event the way a
// browser does.
import { afterEach, describe, expect, it } from "vitest"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { normalizeEventForViewport } from "./normalizeEventForViewport"

const FRAME_LEFT = 100
const FRAME_TOP = 50

/**
 * A frame placed at (100, 50) in the viewport, unscaled. jsdom lays nothing
 * out, so the frame reports its box. `isSpineItem` says whether the reader
 * knows it as a spine item's frame.
 */
const mountFrame = ({ isSpineItem }: { isSpineItem: boolean }) => {
  const frame = document.createElement("iframe")

  document.body.appendChild(frame)

  Object.defineProperties(frame, {
    offsetWidth: { value: 200 },
    offsetHeight: { value: 100 },
  })
  frame.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: FRAME_LEFT, y: FRAME_TOP, width: 200, height: 100 })

  const frameWindow = frame.contentWindow
  const paragraph = frame.contentDocument?.createElement("p")

  if (!frameWindow || !paragraph) throw new Error("the frame has no document")

  frame.contentDocument?.body.appendChild(paragraph)

  // Cast: only `getSpineItemFromIframe` is read, and only for truthiness.
  const locator = {
    getSpineItemFromIframe: (element: Element) =>
      isSpineItem && element === frame ? {} : undefined,
  } as unknown as SpineLocator

  /** A press at (20, 30) in the frame, dispatched on its paragraph. */
  const press = () => {
    const event = new PointerEvent("pointerdown", {
      pointerId: 7,
      view: frameWindow,
      clientX: 20,
      clientY: 30,
    })

    paragraph.dispatchEvent(event)

    return event
  }

  return { frameWindow, paragraph, locator, press }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("Given a pointer event in a spine item's frame", () => {
  it("forwards it at its position in the viewport, targeting the element it happened on", () => {
    const { paragraph, locator, press } = mountFrame({ isSpineItem: true })
    const event = press()

    const forwarded = normalizeEventForViewport(event, locator)

    expect(forwarded).not.toBe(event)
    expect(forwarded.type).toBe("pointerdown")
    expect(forwarded.pointerId).toBe(7)
    expect({ clientX: forwarded.clientX, clientY: forwarded.clientY }).toEqual({
      clientX: 20 + FRAME_LEFT,
      clientY: 30 + FRAME_TOP,
    })
    expect(forwarded.target).toBe(paragraph)
  })

  it("forwards the same input: pointer, buttons, pressure and modifier keys", () => {
    const { frameWindow, paragraph, locator } = mountFrame({
      isSpineItem: true,
    })
    const input = {
      pointerId: 7,
      pointerType: "pen",
      isPrimary: true,
      button: 2,
      buttons: 2,
      width: 3,
      height: 4,
      pressure: 0.5,
      tangentialPressure: 0.25,
      tiltX: 10,
      tiltY: -10,
      twist: 45,
      altKey: true,
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
      screenX: 11,
      screenY: 12,
      movementX: 1,
      movementY: 2,
      detail: 1,
    }
    const event = new PointerEvent("pointerdown", {
      ...input,
      view: frameWindow,
    })

    paragraph.dispatchEvent(event)

    const forwarded = normalizeEventForViewport(event, locator)

    expect(
      Object.fromEntries(
        Object.keys(input).map((key) => [
          key,
          forwarded[key as keyof typeof input],
        ]),
      ),
    ).toEqual(input)
  })
})

describe("Given a pointer event in a frame the reader does not know", () => {
  it("forwards a copy where it happened", () => {
    const { locator, press } = mountFrame({ isSpineItem: false })
    const event = press()

    const forwarded = normalizeEventForViewport(event, locator)

    expect(forwarded).not.toBe(event)
    expect(forwarded.pointerId).toBe(7)
    expect({ clientX: forwarded.clientX, clientY: forwarded.clientY }).toEqual({
      clientX: 20,
      clientY: 30,
    })
  })
})
