import { describe, expect, it, test } from "vitest"
import { isDeepEqual, isShallowEqual } from "./objects"

test(`shallow comparision`, () => {
  const base = { a: 1, b: 2 }
  expect(isShallowEqual(base, { a: 1, b: 2 })).toBe(true)
  expect(isShallowEqual(base, { a: 1, b: 3 })).toBe(false)
  expect(isShallowEqual(base, { a: 1, b: 2, c: 3 })).toBe(false)
  expect(isShallowEqual(base, { a: 1 })).toBe(false)
  expect(isShallowEqual([], [])).toBe(true)
  expect(isShallowEqual([0], [0])).toBe(true)
  expect(isShallowEqual([0, 1, 2], [0, 1, 2])).toBe(true)
  expect(isShallowEqual([0, 1, 2], [0, 2, 1])).toBe(false)
  expect(isShallowEqual([0], [1])).toBe(false)
})

test(`not support deep comparision`, () => {
  const base = { a: { b: 2 } }
  expect(isShallowEqual(base, { a: { b: 2 } })).toBe(false)
})

test(`null === null`, () => {
  expect(isShallowEqual(null, null)).toBe(true)
})

test(`null !== {}`, () => {
  expect(isShallowEqual({}, null)).toBe(false)
  expect(isShallowEqual(null, {})).toBe(false)
})

describe(`isDeepEqual`, () => {
  it(`returns true for identical primitives`, () => {
    expect(isDeepEqual(1, 1)).toBe(true)
    expect(isDeepEqual(`a`, `a`)).toBe(true)
    expect(isDeepEqual(true, true)).toBe(true)
    expect(isDeepEqual(undefined, undefined)).toBe(true)
    expect(isDeepEqual(null, null)).toBe(true)
  })

  it(`distinguishes +0 from -0 (Object.is semantics)`, () => {
    expect(isDeepEqual(0, 0)).toBe(true)
    expect(isDeepEqual(0, -0)).toBe(false)
  })

  it(`returns false across primitive type boundaries`, () => {
    expect(isDeepEqual(0, false)).toBe(false)
    expect(isDeepEqual(``, false)).toBe(false)
    expect(isDeepEqual(1, `1`)).toBe(false)
  })

  it(`returns false when one side is null and the other is an object`, () => {
    expect(isDeepEqual(null, {})).toBe(false)
    expect(isDeepEqual({}, null)).toBe(false)
    expect(isDeepEqual(null, [])).toBe(false)
  })

  it(`compares plain objects by keys`, () => {
    const base = { a: 1, b: 2 }
    expect(isDeepEqual(base, { a: 1, b: 2 })).toBe(true)
    expect(isDeepEqual(base, { a: 1, b: 3 })).toBe(false)
    expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(isDeepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  })

  it(`recurses into nested objects`, () => {
    expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
      true,
    )
    expect(isDeepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
      false,
    )
    expect(isDeepEqual({ a: { b: 1 } }, { a: { b: 1, c: 2 } })).toBe(false)
  })

  it(`recurses into arrays`, () => {
    expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(isDeepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
    expect(isDeepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
    expect(isDeepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false)
  })

  it(`compares class instances by their enumerable own keys`, () => {
    class Point {
      constructor(
        public readonly x: number,
        public readonly y: number,
      ) {}
    }

    expect(isDeepEqual(new Point(1, 2), new Point(1, 2))).toBe(true)
    expect(isDeepEqual(new Point(1, 2), new Point(1, 3))).toBe(false)
    expect(isDeepEqual(new Point(1, 2), { x: 1, y: 2 })).toBe(true)
  })

  it(`compares symbols by reference`, () => {
    const shared = Symbol(`shared`)

    expect(isDeepEqual(shared, shared)).toBe(true)
    expect(isDeepEqual(Symbol(`a`), Symbol(`a`))).toBe(false)
    expect(isDeepEqual({ id: shared }, { id: shared })).toBe(true)
    expect(isDeepEqual({ id: Symbol(`a`) }, { id: Symbol(`a`) })).toBe(false)
  })

  it(`treats two empty containers as equal`, () => {
    expect(isDeepEqual({}, {})).toBe(true)
    expect(isDeepEqual([], [])).toBe(true)
  })

  it(`deduplicates navigation-shaped entries (call-site contract)`, () => {
    class SpinePosition {
      constructor(
        public readonly x: number,
        public readonly y: number,
      ) {}
    }
    const id = Symbol()
    const make = () => ({
      position: new SpinePosition(0, 0),
      id,
      requestedNavigation: { position: new SpinePosition(0, 0) },
    })

    expect(isDeepEqual(make(), make())).toBe(true)
    expect(isDeepEqual(make(), { ...make(), id: Symbol() })).toBe(false)
    expect(
      isDeepEqual(make(), {
        ...make(),
        position: new SpinePosition(0, 1),
      }),
    ).toBe(false)
  })
})
