import { describe, expect, it } from "vitest"
import { ReactiveEntity } from "./ReactiveEntity"

type TestState = {
  element: HTMLElement | undefined
  position: { x: number }
}

class TestEntity extends ReactiveEntity<TestState> {
  update(state: Partial<TestState>) {
    this.mergeCompare(state)
  }
}

const createTestEntity = () =>
  new TestEntity({ element: undefined, position: { x: 0 } })

describe(`Given a watched field`, () => {
  it(`should report a DOM element replaced by another`, () => {
    const entity = createTestEntity()
    const firstElement = document.createElement(`div`)
    const secondElement = document.createElement(`div`)
    firstElement.id = `first`
    secondElement.id = `second`
    const reportedElementIds: (string | undefined)[] = []

    entity.watch(`element`).subscribe((element) => {
      reportedElementIds.push(element?.id)
    })
    entity.update({ element: firstElement })
    entity.update({ element: secondElement })

    expect(reportedElementIds).toEqual([undefined, `first`, `second`])
  })

  it(`should not report a plain object replaced by an equal copy`, () => {
    const entity = createTestEntity()
    const reportedPositions: { x: number }[] = []

    entity.watch(`position`).subscribe((position) => {
      reportedPositions.push(position)
    })
    entity.update({ position: { x: 1 } })
    entity.update({ position: { x: 1 } })

    expect(reportedPositions).toEqual([{ x: 0 }, { x: 1 }])
  })
})
