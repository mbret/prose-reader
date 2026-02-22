import { afterEach, expect, it, vi } from "vitest"
import { Report } from "./report"

afterEach(() => {
  vi.restoreAllMocks()
})

it("should support enabling and disabling report at runtime", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {})
  const report = Report.namespace("shared-report-test", false)

  report.log("first")
  report.enable(true)
  report.log("second")
  report.enable(false)
  report.log("third")

  expect(spy).toHaveBeenCalledTimes(1)
})
