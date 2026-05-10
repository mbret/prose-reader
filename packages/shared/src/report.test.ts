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

it("should create child namespaces with the parent enabled state by default", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {})
  const report = Report.namespace("shared-report-test", false)
  const childReport = report.namespace("child")

  childReport.log("first")
  childReport.enable(true)
  childReport.log("second")

  expect(spy).toHaveBeenCalledTimes(1)
})

it("should allow child namespaces to override the parent enabled state", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {})
  const report = Report.namespace("shared-report-test", false)
  const childReport = report.namespace("child", true)

  childReport.log("first")

  expect(spy).toHaveBeenCalledTimes(1)
})

it("should color only the namespace segment created with an override", () => {
  const report = Report.namespace("shared-report-test", true, {
    color: "red",
  })
  const childReport = report.namespace("child")
  const childReportWithColor = report.namespace("child", {
    color: "blue",
  })
  const childReportWithLegacyColor = report.namespace("child", undefined, {
    color: "green",
  })

  expect(childReport.getGroupArgs("title")).toEqual([
    "%c[shared-report-test]%c [child] title",
    "color: red",
    "color: red",
  ])
  expect(childReportWithColor.getGroupArgs("title")).toEqual([
    "%c[shared-report-test]%c [child] title",
    "color: red",
    "color: blue",
  ])
  expect(childReportWithLegacyColor.getGroupArgs("title")).toEqual([
    "%c[shared-report-test]%c [child] title",
    "color: red",
    "color: green",
  ])
})
