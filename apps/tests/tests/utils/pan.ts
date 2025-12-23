import type { Locator } from "@playwright/test"

export async function pan(
  locator: Locator,
  deltaX?: number,
  deltaY?: number,
  steps?: number,
) {
  const { centerX, centerY } = await locator.evaluate((target: HTMLElement) => {
    const bounds = target.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    return { centerX, centerY }
  })

  const commonInit = {
    pointerId: 1,
    isPrimary: true,
    pointerType: "touch",
    bubbles: true,
    cancelable: true,
  }

  // Providing only clientX and clientY as the app only cares about those.

  await locator.dispatchEvent("pointerdown", {
    ...commonInit,
    clientX: centerX,
    clientY: centerY,
  })

  const _steps = steps ?? 5
  const _deltaX = deltaX ?? 0
  const _deltaY = deltaY ?? 0

  for (let i = 1; i <= _steps; i++) {
    const currentX = centerX + (_deltaX * i) / _steps
    const currentY = centerY + (_deltaY * i) / _steps

    await locator.dispatchEvent("pointermove", {
      ...commonInit,
      clientX: currentX,
      clientY: currentY,
    })
  }

  const endX = centerX + _deltaX
  const endY = centerY + _deltaY

  await locator.dispatchEvent("pointerup", {
    ...commonInit,
    clientX: endX,
    clientY: endY,
  })
  await locator.dispatchEvent("pointerout", {
    ...commonInit,
    clientX: endX,
    clientY: endY,
  })
  await locator.dispatchEvent("pointerleave", {
    ...commonInit,
    clientX: endX,
    clientY: endY,
  })
}
