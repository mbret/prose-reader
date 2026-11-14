import { isObservable } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createFullTestReader,
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

const readPropertyTwice = (target: object, propertyName: string) => {
  try {
    const firstRead: unknown = Reflect.get(target, propertyName)
    const secondRead: unknown = Reflect.get(target, propertyName)

    return { firstRead, secondRead }
  } catch {
    return undefined
  }
}

const walkStreamsBreadthFirst = (root: object, maxDepth = 6) => {
  const visitedObjects = new WeakSet<object>([root])
  const pendingObjects = [{ target: root, path: "reader", depth: 0 }]
  const checkedStreamPaths: string[] = []
  const recreatedStreamPaths: string[] = []

  for (const { target, path, depth } of pendingObjects) {
    for (const propertyName of getPropertyNamesWithPrototypes(target)) {
      const reads = readPropertyTwice(target, propertyName)
      const propertyPath = `${path}.${propertyName}`

      if (!reads) continue

      if (isObservable(reads.firstRead)) {
        checkedStreamPaths.push(propertyPath)

        if (reads.firstRead !== reads.secondRead) {
          recreatedStreamPaths.push(propertyPath)
        }
      }

      const { firstRead } = reads

      if (
        typeof firstRead === "object" &&
        firstRead !== null &&
        !(firstRead instanceof Node) &&
        !visitedObjects.has(firstRead) &&
        depth < maxDepth
      ) {
        visitedObjects.add(firstRead)
        pendingObjects.push({
          target: firstRead,
          path: propertyPath,
          depth: depth + 1,
        })
      }
    }
  }

  return { checkedStreamPaths, recreatedStreamPaths }
}

describe("Given a reader with every core enhancer and its spine items", () => {
  /**
   * A consumer that keys on a stream subscribes again whenever it changes:
   * reactjrx's useObserve, given a new stream on every render, never settles.
   */
  it(`should give the same stream on every read`, async () => {
    const reader = createFullTestReader()
    mountTestReader(reader)
    await settledOn(reader)

    const { checkedStreamPaths, recreatedStreamPaths } =
      walkStreamsBreadthFirst(reader)

    expect(checkedStreamPaths).toEqual(
      expect.arrayContaining([
        "reader.pagination.state$",
        "reader.spineItemsManager.items.0.isReady$",
      ]),
    )
    expect(recreatedStreamPaths).toEqual([])
  })
})
