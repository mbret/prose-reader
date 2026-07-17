import { describe, expect, it } from "vitest"
import { parseKoboXml } from "./parse"

describe("parseKoboXml", () => {
  it("returns only kind for an unknown root element", () => {
    expect(parseKoboXml("<other/>")).toEqual({ kind: "kobo" })
  })

  it("returns kind only when fixed-layout is not true", () => {
    expect(
      parseKoboXml(
        `<?xml version="1.0"?><display_options><platform/></display_options>`,
      ),
    ).toEqual({ kind: "kobo" })
  })

  it("reads fixed-layout from display_options", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<display_options><platform>` +
      `<option name="fixed-layout">true</option>` +
      `</platform></display_options>`

    expect(parseKoboXml(xml)).toEqual({
      kind: "kobo",
      renditionLayout: "pre-paginated",
    })
  })

  it("finds fixed-layout when it is not the first option", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<display_options><platform>` +
      `<option name="other">x</option>` +
      `<option name="fixed-layout">true</option>` +
      `</platform></display_options>`

    expect(parseKoboXml(xml)).toEqual({
      kind: "kobo",
      renditionLayout: "pre-paginated",
    })
  })
})
