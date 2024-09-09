/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, it } from "vitest"
import { navigationFallbackHook } from "./navigationFallback"

it("should create valid toc", async () => {
  const manifest = await navigationFallbackHook({
    archive: {
      filename: "archive",
      close: async () => {},
      files: [
        {
          base64: async () => ``,
          basename: "2.jpg",
          blob: () => Promise.resolve({} as any),
          dir: false,
          size: 0,
          string: () => Promise.resolve(``),
          uri: "folder c/2.jpg",
        },
        {
          base64: async () => ``,
          basename: "1.jpg",
          blob: () => Promise.resolve({} as any),
          dir: false,
          size: 0,
          string: () => Promise.resolve(``),
          uri: "folder c/1.jpg",
        },
        {
          base64: async () => ``,
          basename: "1.jpg",
          blob: () => Promise.resolve({} as any),
          dir: false,
          size: 0,
          string: () => Promise.resolve(``),
          uri: "folder a/folder b/1.jpg",
        },
        {
          base64: async () => ``,
          basename: "Screenshot from 2024-08-28 13-21-11.png",
          blob: () => Promise.resolve({} as any),
          dir: false,
          size: 0,
          string: () => Promise.resolve(``),
          uri: "folder a/Screenshot from 2024-08-28 13-21-11.png",
        },
        {
          base64: async () => ``,
          basename: "4.jpg",
          blob: () => Promise.resolve({} as any),
          dir: false,
          size: 0,
          string: () => Promise.resolve(``),
          uri: "folder d/folder e/4.jpg",
        },
      ],
    },
    baseUrl: "",
  })({
    filename: "",
    items: [],
    readingDirection: "ltr",
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    spineItems: [],
    title: "",
  })

  expect(manifest.nav).toEqual({
    toc: [
      {
        contents: [
          {
            contents: [],
            href: "folder%20a/folder%20b/1.jpg",
            path: "folder a/folder b/1.jpg",
            title: "folder b",
          },
        ],
        href: "folder%20a/Screenshot%20from%202024-08-28%2013-21-11.png",
        path: "folder a/Screenshot from 2024-08-28 13-21-11.png",
        title: "folder a",
      },
      {
        contents: [],
        href: "folder%20c/1.jpg",
        path: "folder c/1.jpg",
        title: "folder c",
      },
      {
        contents: [
          {
            contents: [],
            href: "folder%20d/folder%20e/4.jpg",
            path: "folder d/folder e/4.jpg",
            title: "folder e",
          },
        ],
        href: "folder%20d/folder%20e/4.jpg",
        path: "folder d/folder e/4.jpg",
        title: "folder d",
      },
    ],
  })
})
