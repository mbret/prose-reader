/**
 * The reader's path for a book in `public/epubs`, relative to the router's
 * basename. The reader fetches the book from the url its key encodes.
 */
const getReaderPathOfDemoBook = (filename: string) =>
  `/reader/${btoa(`${window.location.origin}/epubs/${filename}`)}`

export const COMICS = [
  {
    link: getReaderPathOfDemoBook("haruko-comic.zip"),
    name: "Manga, horizontal scrolling",
    type: `FXL - RTL`,
  },
  {
    link: `${getReaderPathOfDemoBook("haruko-comic.zip")}?vertical`,
    name: "Manga, vertical scrolling",
    type: `FXL - RTL`,
  },
  {
    link: `${getReaderPathOfDemoBook("haruko-comic.zip")}?free&vertical`,
    name: "Manga, vertical free scrolling",
    type: `FXL - RTL`,
  },
  {
    link: `${getReaderPathOfDemoBook("rendition-flow-webtoon-one-page.epub")}?free&vertical`,
    name: "Webtoon (one big image), vertical free scrolling",
    type: `RFL - LTR`,
  },
  {
    link: `${getReaderPathOfDemoBook("rendition-flow-webtoon.epub")}?free&vertical`,
    name: "Webtoon, vertical free scrolling",
    type: `RFL - LTR`,
  },
]

export const PDFS = [
  {
    name: `sample-3.pdf`,
    type: `EN - LTR - FXL`,
    link: getReaderPathOfDemoBook("sample-3.pdf"),
  },
]

export const AUDIOBOOKS = [
  {
    name: `Aesop Fables, Volume One (LibriVox)`,
    type: `EN - LTR - AUDIO`,
    link: getReaderPathOfDemoBook("aesop_fables_volume_one_librivox.zip"),
  },
]

export const EPUBS = [
  {
    name: `accessible_epub_3.epub`,
    type: `EN - LTR - RFL`,
    link: getReaderPathOfDemoBook("accessible_epub_3.epub"),
  },
  {
    name: `sous-le-vent.epub`,
    type: `FR - LTR - FXL`,
    link: getReaderPathOfDemoBook("sous-le-vent.epub"),
  },
  {
    name: `moby-dick_txt.txt`,
    type: `EN - LTR - TXT`,
    link: getReaderPathOfDemoBook("moby-dick_txt.txt"),
  },

  {
    name: `sample.cbz`,
    type: `EN - LTR - FXL`,
    link: getReaderPathOfDemoBook("sample.cbz"),
  },
  {
    name: `cc-shared-culture.epub`,
    type: `EN - LTR - MEDIA`,
    link: getReaderPathOfDemoBook("cc-shared-culture.epub"),
  },
  {
    name: `Accessibility-Tests-Mathematics.epub`,
    type: `EN - LTR - RFL`,
    link: getReaderPathOfDemoBook("Accessibility-Tests-Mathematics.epub"),
  },
  {
    name: `regime-anticancer-arabic.epub`,
    type: `AR - RTL - RFL`,
    link: getReaderPathOfDemoBook("regime-anticancer-arabic.epub"),
  },
  {
    name: `mymedia_lite.epub`,
    type: `JP - RTL - RFL`,
    link: getReaderPathOfDemoBook("mymedia_lite.epub"),
  },
  {
    name: `haruko-html-jpeg.epub`,
    type: `JP - RTL - FXL(P)`,
    link: getReaderPathOfDemoBook("haruko-html-jpeg.epub"),
  },
]
