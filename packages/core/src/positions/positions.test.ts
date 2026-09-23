import type { PositionTarget } from "@prose-reader/shared/positions"
import { filter } from "rxjs"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { Pagination } from "../pagination/Pagination"
import type { Positions } from "../pagination/types"
import type { CreateReaderOptions } from "../reader"
import { Report } from "../report"
import { cleanups, setup } from "./testUtils"

const target: PositionTarget = { format: "test", value: "item:1#target" }

describe("position formats", () => {
  it("exposes an explicit canonical CFI before any position is available", () => {
    const { reader } = setup()
    const initial = new Pagination(reader.context, reader.spineItemsManager)
      .value
    const positions: Positions = initial.begin.positions
    expectTypeOf(positions.cfi).toEqualTypeOf<string | undefined>()
    expectTypeOf(positions["unregistered"]).toEqualTypeOf<string | undefined>()
    expectTypeOf<Positions>().not.toEqualTypeOf<
      Record<string, string | undefined>
    >()
    expect(positions).toEqual({ cfi: undefined })
    expect(initial.end.positions).toEqual({ cfi: undefined })
    expect(reader.pagination.state.begin).not.toHaveProperty("cfi")
    expect(reader.pagination.state.end).not.toHaveProperty("cfi")
  })

  it.each([
    "controlled",
    "scrollable",
  ] satisfies CreateReaderOptions["pageTurnMode"][])(
    "consumes a pending target when its item becomes ready (%s)",
    async (pageTurnMode) => {
      const { reader, load, settled, isSettled$, resolve, frames } = setup({
        pageTurnMode,
      })
      const states: boolean[] = []
      isSettled$.subscribe((value) => states.push(value))
      const saved: string[] = []
      reader.pagination.state$
        .pipe(filter((state) => state.isSettled))
        .subscribe((state) => {
          if (state.begin.positions["test"])
            saved.push(state.begin.positions["test"])
        })
      reader.navigation.goTo(target, { animate: false })
      expect(reader.navigation.getNavigation()).toMatchObject({
        target,
        position: { x: 100, y: 0 },
      })
      expect(resolve).not.toHaveBeenCalled()
      expect(states.at(-1)).toBe(false)
      load(1)
      await settled()
      const navigation = reader.navigation.getNavigation()
      expect(navigation.target).toBeUndefined()
      expect(navigation.cfi).toMatch(/^epubcfi/)
      expect(navigation.position.x).toBe(150)
      expect(resolve).toHaveBeenCalledExactlyOnceWith(target.value, {
        document: frames[1]?.doc,
        spineItem: reader.context.manifest.spineItems[1],
      })
      expect(saved).not.toContain("item:1#start")
      expect(saved.at(-1)).toBe("item:1#target")
      expect(states.at(-1)).toBe(true)
    },
  )

  it.each([
    "controlled",
    "scrollable",
  ] satisfies CreateReaderOptions["pageTurnMode"][])(
    "restores an initially unloaded CFI (%s)",
    async (pageTurnMode) => {
      const { reader, frames, load, settled } = setup({ pageTurnMode })
      const node = frames[1]?.doc.getElementById("target")?.firstChild
      const item = reader.spineItemsManager.get(1)
      if (!node || !item) throw new Error("Expected target node")
      const value = reader.cfi.generateCfiFromDomPosition(
        { node, offset: 0 },
        item.item,
      )
      reader.navigation.goTo({ format: "cfi", value }, { animate: false })
      expect(reader.navigation.getNavigation()).toMatchObject({
        cfi: value,
        target: undefined,
        position: { x: 100, y: 0 },
      })
      load(1)
      await settled()
      expect(reader.navigation.getNavigation().position.x).toBe(150)
    },
  )

  it("uses the URL adapter for deferred fragments and safely handles invalid input", async () => {
    const { reader, load, settled } = setup()
    reader.navigation.goToUrl("https://example.com/two.xhtml#target")
    expect(reader.navigation.getNavigation().target?.format).toBe("url")
    load(1)
    await settled()
    expect(reader.navigation.getNavigation()).toMatchObject({
      target: undefined,
      position: { x: 150, y: 0 },
    })
    reader.navigation.goToUrl("https://example.com/two.xhtml")
    await settled()
    expect(reader.navigation.getNavigation().position.x).toBe(100)
    reader.navigation.goToUrl("https://example.com/two.xhtml#invalid%")
    await settled()
    expect(reader.navigation.getNavigation().position.x).toBe(100)
    load(0)
    reader.navigation.goTo(
      { format: "cfi", value: "invalid" },
      { animate: false },
    )
    await settled()
    expect(reader.navigation.getNavigation().spineItem).toBe(0)
  })

  it("rejects duplicate registry names and unregisters idempotently", () => {
    const { reader, unregister } = setup()
    const format = reader.positions.get("test")
    if (!format) throw new Error("Expected test format")
    expect(() => reader.positions.register(format)).toThrow()
    expect(() =>
      reader.positions.register({ ...format, name: "cfi" }),
    ).toThrow()
    expect(() => reader.positions.register({ ...format, name: "" })).toThrow()
    unregister()
    unregister()
    reader.positions.register(format)
    unregister() // an old registration cannot delete a new one
    expect(reader.positions.get("test")).toBe(format)
    expect(reader.positions.list().map((format) => format.name)).toEqual([
      "cfi",
      "url",
      "test",
    ])
  })

  it("restores from CFI after conversion without calling the adapter again", async () => {
    const { reader, load, settled, resolve, relayout, nodeNavigation } = setup()
    load(1)
    reader.navigation.goTo(target, { animate: false })
    await settled()
    const cfi = reader.navigation.getNavigation().cfi
    const item = reader.spineItemsManager.get(1)
    if (!item) throw new Error("Expected item")
    vi.spyOn(item, "layoutInfo", "get").mockReturnValue({
      width: 200,
      height: 100,
    })
    // Change the old dimensions to exercise the CFI restoration branch.
    reader.navigation.internalNavigator.navigationSubject.next({
      ...reader.navigation.getNavigation(),
      spineItemWidth: 50,
    })
    nodeNavigation.mockClear()
    relayout()
    await settled()
    expect(reader.navigation.getNavigation().cfi).toBe(cfi)
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(nodeNavigation).toHaveBeenCalled()
  })

  it("falls back to the named item for an unresolved value", async () => {
    const { reader, load, settled } = setup()
    reader.navigation.goTo(
      { format: "test", value: "item:1#missing" },
      { animate: false },
    )
    load(1)
    await settled()
    expect(reader.navigation.getNavigation()).toMatchObject({
      target: undefined,
      spineItem: 1,
      position: { x: 100, y: 0 },
    })
  })

  it("warns and falls back to the first item for an unknown format", async () => {
    const { reader, load, settled } = setup()
    const warning = vi.spyOn(Report, "warn")
    load(0)
    reader.navigation.goTo(
      { format: "unknown", value: "value" },
      { animate: false },
    )
    await settled()
    expect(warning).toHaveBeenCalled()
    expect(reader.navigation.getNavigation()).toMatchObject({
      spineItem: 0,
      target: undefined,
    })
  })

  it("resolves a locked pending request after unlock", async () => {
    const { reader, load, settled, resolve } = setup()
    const unlock = reader.navigation.lock()
    reader.navigation.goTo(target, { animate: false })
    load(1)
    expect(resolve).not.toHaveBeenCalled()
    unlock()
    await settled()
    expect(reader.navigation.getNavigation()).toMatchObject({
      target: undefined,
      position: { x: 150, y: 0 },
    })
  })

  it.each([
    "controlled",
    "scrollable",
  ] satisfies CreateReaderOptions["pageTurnMode"][])(
    "applies initial position at mount (%s)",
    async (pageTurnMode) => {
      const { reader, load, settled } = setup({
        pageTurnMode,
        position: target,
      })
      const container = document.createElement("div")
      document.body.appendChild(container)
      cleanups.push(() => container.remove())
      expect(reader.navigation.getNavigation().target).toBeUndefined()
      reader.mount(container)
      expect(reader.navigation.getNavigation().target).toEqual(target)
      load(1)
      await settled()
      expect(reader.navigation.getNavigation().target).toBeUndefined()
    },
  )

  it("generates all formats from the same node and observes registry changes", async () => {
    const { reader, load, settled, generate, unregister, relayout } = setup()
    reader.mount(document.createElement("div"))
    load(1)
    reader.positions.register({
      name: "absent",
      spineItemIndexOf: () => undefined,
      resolve: () => undefined,
      generate: () => undefined,
    })
    reader.navigation.goTo(target, { animate: false })
    await settled()
    const state = reader.pagination.state
    expect(state.begin).not.toHaveProperty("cfi")
    expect(state.end).not.toHaveProperty("cfi")
    expect(state.begin.positions).not.toHaveProperty("absent")
    expect(state.begin.positions).not.toHaveProperty("url")
    const resolved = reader.cfi.resolveCfi({
      cfi: state.begin.positions.cfi ?? "",
    })
    expect(generate.mock.calls.at(-1)?.[0]).toEqual({
      node: resolved.node,
      offset: resolved.offset,
    })
    const removeLater = reader.positions.register({
      name: "later",
      spineItemIndexOf: () => undefined,
      resolve: () => undefined,
      generate: () => "later-value",
    })
    relayout()
    await settled()
    expect(reader.pagination.state.begin.positions["later"]).toBe("later-value")
    unregister()
    removeLater()
    relayout()
    await settled()
    expect(reader.pagination.state.begin.positions).not.toHaveProperty("test")
    expect(reader.pagination.state.begin.positions).not.toHaveProperty("later")
  })

  it("keeps generation and resolution hooks on the canonical CFI path", async () => {
    const { reader, load, settled } = setup()
    reader.hookManager.register("cfi.afterGenerate", ({ cfi }) =>
      cfi.replace("/6/4[", "/6/6["),
    )
    reader.hookManager.register("cfi.beforeResolve", ({ cfi }) =>
      cfi.replace("/6/6[", "/6/4["),
    )
    load(1)
    reader.navigation.goTo(target, { animate: false })
    await settled()
    const canonical = reader.navigation.getNavigation().cfi
    expect(canonical).toContain("/6/6[")
    expect(reader.pagination.state.begin.positions.cfi).toContain("/6/6[")
    if (!canonical) throw new Error("Expected CFI")
    reader.navigation.goToCfi(canonical, { animate: false })
    await settled()
    expect(reader.navigation.getNavigation()).toMatchObject({
      spineItem: 1,
      position: { x: 150, y: 0 },
    })
  })

  it("goToCfi and goToUrl use the same targets as goTo", async () => {
    const { reader, load, settled } = setup()
    load(1)
    reader.navigation.goTo(target, { animate: false })
    await settled()
    const cfi = reader.navigation.getNavigation().cfi ?? ""
    reader.navigation.goToCfi(cfi, { animate: false })
    const sugar = reader.navigation.getNavigation()
    reader.navigation.goTo({ format: "cfi", value: cfi }, { animate: false })
    expect(reader.navigation.getNavigation()).toMatchObject({
      position: sugar.position,
      cfi: sugar.cfi,
      spineItem: sugar.spineItem,
    })
    reader.navigation.goToUrl("https://example.com/two.xhtml#target")
    const url = reader.navigation.getNavigation()
    reader.navigation.goTo(
      { format: "url", value: "https://example.com/two.xhtml#target" },
      { animate: false },
    )
    expect(reader.navigation.getNavigation()).toMatchObject({
      position: url.position,
      cfi: url.cfi,
      spineItem: url.spineItem,
    })
    expect(url.target).toBeUndefined()
    expect(url.position.x).toBe(150)
  })
})
