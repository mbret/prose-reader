import { describe, expect, it } from "vitest"
import { parseAppleDisplayOptionsXml } from "./parse"

describe("parseAppleDisplayOptionsXml", () => {
  it("returns only kind for an unknown root element", () => {
    expect(parseAppleDisplayOptionsXml("<other/>")).toEqual({ kind: "apple" })
  })

  it("records display_options with empty platform", () => {
    expect(
      parseAppleDisplayOptionsXml(
        `<?xml version="1.0"?><display_options><platform/></display_options>`,
      ),
    ).toEqual({
      kind: "apple",
      displayOptions: { platform: { options: [] } },
    })
  })

  it("records display_options without platform element", () => {
    expect(
      parseAppleDisplayOptionsXml(`<?xml version="1.0"?><display_options/>`),
    ).toEqual({
      kind: "apple",
      displayOptions: {},
    })
  })

  it("records options under platform", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<display_options><platform>` +
      `<option name="fixed-layout">true</option>` +
      `</platform></display_options>`

    expect(parseAppleDisplayOptionsXml(xml)).toEqual({
      kind: "apple",
      displayOptions: {
        platform: {
          options: [{ name: "fixed-layout", value: "true" }],
        },
      },
    })
  })

  it("preserves option order", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<display_options><platform>` +
      `<option name="other">x</option>` +
      `<option name="fixed-layout">true</option>` +
      `</platform></display_options>`

    expect(parseAppleDisplayOptionsXml(xml)).toEqual({
      kind: "apple",
      displayOptions: {
        platform: {
          options: [
            { name: "other", value: "x" },
            { name: "fixed-layout", value: "true" },
          ],
        },
      },
    })
  })

  it("records fixed-layout value without normalizing", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<display_options><platform>` +
      `<option name="fixed-layout">false</option>` +
      `</platform></display_options>`

    expect(parseAppleDisplayOptionsXml(xml)).toEqual({
      kind: "apple",
      displayOptions: {
        platform: {
          options: [{ name: "fixed-layout", value: "false" }],
        },
      },
    })
  })
})
