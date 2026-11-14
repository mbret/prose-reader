import { expect, test } from "vitest"
import { isShallowEqual } from "./objects"

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

test(`an object that keeps its state out of its own keys equals only itself`, () => {
  const map = new Map([[`a`, 1]])

  expect(isShallowEqual(map, new Map([[`a`, 2]]))).toBe(false)
  expect(isShallowEqual(new Date(0), new Date(1))).toBe(false)
  expect(isShallowEqual(map, {})).toBe(false)
  expect(isShallowEqual(map, map)).toBe(true)
})

test(`instances of a class compare by their own fields`, () => {
  class Position {
    x: number
    y: number

    constructor(x: number, y: number) {
      this.x = x
      this.y = y
    }
  }

  expect(isShallowEqual(new Position(1, 2), new Position(1, 2))).toBe(true)
  expect(isShallowEqual(new Position(1, 2), new Position(1, 3))).toBe(false)
})
