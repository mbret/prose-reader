import { isObservable } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createFullTestReader,
  createPrePaginatedManifest,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "./tests/readerHarness"

installReaderTestEnvironment()

const getPropertyNamesWithPrototypes = (target: object) => {
  const propertyNames = new Set<string>()

  for (
    let prototype: object | null = target;
    prototype && prototype !== Object.prototype;
    prototype = Object.getPrototypeOf(prototype)
  ) {
    for (const propertyName of Object.getOwnPropertyNames(prototype)) {
      propertyNames.add(propertyName)
    }
  }

  propertyNames.delete("constructor")

  return propertyNames
}

/**
 * Reads every property of `root` twice, getters included, down to
 * `maxDepth`, and returns the path of each observable that is a different
 * object on the second read.
 */
const findStreamsRecreatedOnEachRead = (root: object, maxDepth = 6) => {
  const visitedObjects = new WeakSet<object>()
  const recreatedStreamPaths: string[] = []

  const visit = (target: unknown, path: string, depth: number) => {
    if (
      typeof target !== "object" ||
      target === null ||
      target instanceof Node ||
      depth > maxDepth ||
      visitedObjects.has(target)
    ) {
      return
    }

    visitedObjects.add(target)

    for (const propertyName of getPropertyNamesWithPrototypes(target)) {
      const firstRead: unknown = Reflect.get(target, propertyName)
      const secondRead: unknown = Reflect.get(target, propertyName)

      if (isObservable(firstRead) && firstRead !== secondRead) {
        recreatedStreamPaths.push(`${path}.${propertyName}`)
      }

      visit(firstRead, `${path}.${propertyName}`, depth + 1)
    }
  }

  visit(root, "reader", 0)

  return recreatedStreamPaths
}

describe("Given a reader with every core enhancer and its spine items", () => {
  /**
   * A consumer that keys on a stream subscribes again whenever it changes:
   * reactjrx's useObserve, given a new stream on every render, never settles.
   */
  it(`should give the same stream on every read`, async () => {
    const reader = createFullTestReader({
      manifest: createPrePaginatedManifest(),
    })
    mountTestReader(reader)
    await settledOn(reader)

    expect(findStreamsRecreatedOnEachRead(reader)).toEqual([])
  })
})
