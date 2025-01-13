import { urlJoin } from "./url"
import { expect, it, describe } from "vitest"

describe("url join", () => {
  it("should work for simple case", () => {
    expect(urlJoin("http://www.google.com/", "foo/bar", "?test=123")).toEqual(
      "http://www.google.com/foo/bar?test=123",
    )
  })

  it("should work for simple case with new syntax", () => {
    expect(urlJoin(["http://www.google.com/", "foo/bar", "?test=123"])).toEqual(
      "http://www.google.com/foo/bar?test=123",
    )
  })

  it("should work for hashbang urls", () => {
    expect(
      urlJoin(["http://www.google.com", "#!", "foo/bar", "?test=123"]),
    ).toEqual("http://www.google.com/#!/foo/bar?test=123")
  })

  it("should be able to join protocol", () => {
    expect(urlJoin("http:", "www.google.com/", "foo/bar", "?test=123")).toEqual(
      "http://www.google.com/foo/bar?test=123",
    )
  })

  it("should be able to join protocol with slashes", () => {
    expect(
      urlJoin("http://", "www.google.com/", "foo/bar", "?test=123"),
    ).toEqual("http://www.google.com/foo/bar?test=123")
  })

  it("should remove extra slashes", () => {
    expect(
      urlJoin("http:", "www.google.com///", "foo/bar", "?test=123"),
    ).toEqual("http://www.google.com/foo/bar?test=123")
  })

  it("should not remove extra slashes in an encoded URL", () => {
    expect(
      urlJoin(
        "http:",
        "www.google.com///",
        "foo/bar",
        "?url=http%3A//Ftest.com",
      ),
    ).toEqual("http://www.google.com/foo/bar?url=http%3A//Ftest.com")

    expect(urlJoin("http://a.com/23d04b3/", "/b/c.html")).toEqual(
      "http://a.com/23d04b3/b/c.html",
    )
    expect(urlJoin("http://a.com/23d04b3/", "/b/c.html")).not.toEqual(
      "http://a.com/23d04b3//b/c.html",
    )
  })

  it("should support anchors in urls", () => {
    expect(
      urlJoin("http:", "www.google.com///", "foo/bar", "?test=123", "#faaaaa"),
    ).toEqual("http://www.google.com/foo/bar?test=123#faaaaa")
  })

  it("should support protocol-relative urls", () => {
    expect(urlJoin("//www.google.com", "foo/bar", "?test=123")).toEqual(
      "//www.google.com/foo/bar?test=123",
    )
  })

  it("should support file protocol urls", () => {
    expect(urlJoin("file:/", "android_asset", "foo/bar")).toEqual(
      "file://android_asset/foo/bar",
    )

    expect(urlJoin("file:", "/android_asset", "foo/bar")).toEqual(
      "file://android_asset/foo/bar",
    )
  })

  it("should support absolute file protocol urls", () => {
    expect(urlJoin("file:", "///android_asset", "foo/bar")).toEqual(
      "file:///android_asset/foo/bar",
    )

    expect(urlJoin("file:///", "android_asset", "foo/bar")).toEqual(
      "file:///android_asset/foo/bar",
    )

    expect(urlJoin("file:///", "//android_asset", "foo/bar")).toEqual(
      "file:///android_asset/foo/bar",
    )

    expect(urlJoin("file:///android_asset", "foo/bar")).toEqual(
      "file:///android_asset/foo/bar",
    )
  })

  it("should merge multiple query params properly", () => {
    expect(
      urlJoin("http:", "www.google.com///", "foo/bar", "?test=123", "?key=456"),
    ).toEqual("http://www.google.com/foo/bar?test=123&key=456")

    expect(
      urlJoin(
        "http:",
        "www.google.com///",
        "foo/bar",
        "?test=123",
        "?boom=value",
        "&key=456",
      ),
    ).toEqual("http://www.google.com/foo/bar?test=123&boom=value&key=456")

    expect(
      urlJoin("http://example.org/x", "?a=1", "?b=2", "?c=3", "?d=4"),
    ).toEqual("http://example.org/x?a=1&b=2&c=3&d=4")
  })

  it("should merge slashes in paths correctly", () => {
    expect(urlJoin("http://example.org", "a//", "b//", "A//", "B//")).toEqual(
      "http://example.org/a/b/A/B/",
    )
  })

  it("should merge colons in paths correctly", () => {
    expect(urlJoin("http://example.org/", ":foo:", "bar")).toEqual(
      "http://example.org/:foo:/bar",
    )
  })

  it("should merge just a simple path without URL correctly", () => {
    expect(urlJoin("/", "test")).toEqual("/test")
  })

  // it("should fail with segments that are not string", () => {
  //   assert.throws(() => urlJoin(true), /Url must be a string. Received true/);
  //   assert.throws(
  //     () => urlJoin("http://blabla.com/", 1),
  //     /Url must be a string. Received 1/
  //   );
  //   assert.throws(
  //     () => urlJoin("http://blabla.com/", undefined, "test"),
  //     /Url must be a string. Received undefined/
  //   );
  //   assert.throws(
  //     () => urlJoin("http://blabla.com/", null, "test"),
  //     /Url must be a string. Received null/
  //   );
  //   assert.throws(
  //     () => urlJoin("http://blabla.com/", { foo: 123 }, "test"),
  //     /Url must be a string. Received \[object Object\]/
  //   );
  // });

  it("should merge a path with colon properly", () => {
    expect(urlJoin("/users/:userId", "/cars/:carId")).toEqual(
      "/users/:userId/cars/:carId",
    )
  })

  it("should merge slashes in protocol correctly", () => {
    expect(urlJoin("http://example.org", "a")).toEqual("http://example.org/a")
    expect(urlJoin("http:", "//example.org", "a")).toEqual(
      "http://example.org/a",
    )
    expect(urlJoin("http:///example.org", "a")).toEqual("http://example.org/a")
    expect(urlJoin("file:///example.org", "a")).toEqual("file:///example.org/a")

    expect(urlJoin("file:example.org", "a")).toEqual("file://example.org/a")

    expect(urlJoin("file:/", "example.org", "a")).toEqual(
      "file://example.org/a",
    )
    expect(urlJoin("file:", "/example.org", "a")).toEqual(
      "file://example.org/a",
    )
    expect(urlJoin("file:", "//example.org", "a")).toEqual(
      "file://example.org/a",
    )
  })

  it("should skip empty strings", () => {
    expect(urlJoin("http://foobar.com", "", "test")).toEqual(
      "http://foobar.com/test",
    )
    expect(urlJoin("", "http://foobar.com", "", "test")).toEqual(
      "http://foobar.com/test",
    )
  })

  it("should return an empty string if no arguments are supplied", () => {
    expect(urlJoin()).toEqual("")
  })

  it("should not mutate the original reference", () => {
    const input = ["http:", "www.google.com/", "foo/bar", "?test=123"]
    const expected = Array.from(input)

    urlJoin(input)

    expect(input).toEqual(expected)
  })
})
