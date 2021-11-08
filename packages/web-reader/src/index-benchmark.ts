import { createReader } from "@oboku/reader";

const reader = createReader({
  containerElement: document.getElementById(`app`)!,
})

reader.load({
  filename: `benchmark.epub`,
  nav: {
    toc: []
  },
  readingDirection: `ltr`,
  readingOrder: Array(30).fill(0).map((_, index) => ({
    href: `asd`,
    id: `id_${index}`,
    pageSpreadLeft: undefined,
    pageSpreadRight: undefined,
    path: ``,
    progressionWeight: 0.5,
    renditionLayout: `reflowable`,
  })),
  renditionLayout: `reflowable`,
  renditionSpread: `auto`,
  title: `title`,
  items: []
}, {
  fetchResource: async () => new Response(new Blob(fakeContent), {
    status: 200,
    statusText: `ok`,
  })
})

// @ts-ignore
window.reader = reader

const fakeSection = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`
const fakeContent = Array(3).fill(0).map(_ => fakeSection)