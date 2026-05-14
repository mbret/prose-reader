import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { Pagination } from "../../pagination/Pagination"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { ControlledNavigationController } from "./ControlledNavigationController"

const createTestController = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const spineItemsManager = new SpineItemsManager(context, settings)
  const viewport = new Viewport(context, settings)
  const pagination = new Pagination(context, spineItemsManager)
  const spineItemLocator = createSpineItemLocator({
    context,
    settings,
    viewport,
  })
  const spine = new Spine(
    context,
    pagination,
    spineItemsManager,
    spineItemLocator,
    settings,
    hookManager,
    viewport,
  )

  const controller = new ControlledNavigationController(
    settings,
    hookManager,
    context,
    spine,
    viewport,
  )

  return { controller }
}

describe("ControlledNavigationController", () => {
  describe("Given an animation in flight to position X", () => {
    /**
     * Regression: rapid page turns with an animation visually cut.
     *
     * When a navigation request landed while a previous one was still
     * animating to the *same* spine position (typically: spam-tapping at
     * a spine boundary, where the resolver kept returning the same
     * target), the controller re-entered its `switchMap`, ran the
     * unconditional cleanup (`transition: none`, then re-applied the
     * transform via `applyNavigationPosition`), and the rendered position
     * snapped to the target — visually cutting the running CSS
     * transition.
     *
     * The fix dedups on `position` at the source of the navigate stream
     * so a redundant request never reaches the `switchMap`. This is
     * safe in controlled mode because the same `SpinePosition` always
     * maps to the same `translate(...)` on the child element regardless
     * of zoom (zoom is a `scale(...)` on the parent viewport and CSS
     * transforms compose around the child).
     */
    describe("when a redundant request to the same X arrives", () => {
      it("does not reset the running CSS transition mid-animation", async () => {
        const { controller } = createTestController()
        const element = controller.element$.getValue()

        controller.navigate({
          position: new SpinePosition({ x: 100, y: 0 }),
          animation: "turn",
        })

        // Let the inner pipeline cross `delay(1, animationFrameScheduler)`
        // so the `transition` has been written onto the element.
        await waitFor(50)

        expect(element.style.transition).toMatch(/transform .*ms/)

        controller.navigate({
          position: new SpinePosition({ x: 100, y: 0 }),
          animation: "turn",
        })

        // The old code re-entered the `switchMap`, ran the cleanup
        // (`transition: none`) and snapped to the same target — visually
        // cutting the running animation. With dedup the redundant
        // request is dropped before the `switchMap`.
        await waitFor(20)

        expect(element.style.transition).toMatch(/transform .*ms/)
      })

      it("does not flicker `isNavigating$`", async () => {
        const { controller } = createTestController()
        const states: boolean[] = []
        const sub = controller.isNavigating$.subscribe((value) => {
          states.push(value)
        })

        controller.navigate({
          position: new SpinePosition({ x: 100, y: 0 }),
          animation: "turn",
        })
        await waitFor(50)

        controller.navigate({
          position: new SpinePosition({ x: 100, y: 0 }),
          animation: "turn",
        })

        // Wait past the 300ms default animation duration so the original
        // animation completes naturally.
        await waitFor(400)
        sub.unsubscribe()

        expect(states).toEqual([false, true, false])
      })
    })

    describe("when a request to a different position arrives", () => {
      it("switches to the new target", async () => {
        const { controller } = createTestController()
        const element = controller.element$.getValue()

        controller.navigate({
          position: new SpinePosition({ x: 100, y: 0 }),
          animation: "turn",
        })
        await waitFor(50)

        controller.navigate({
          position: new SpinePosition({ x: 200, y: 0 }),
          animation: "turn",
        })
        await waitFor(50)

        expect(element.style.transform).toBe("translate(-200px, 0px)")
      })
    })
  })
})
