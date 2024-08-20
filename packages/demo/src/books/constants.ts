export const COMICS = [
  {
    link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}`,
    name: "Manga, horizontal scrolling",
    type: `FXL - LTR`
  },
  {
    link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}?vertical`,
    name: "Manga, vertical scrolling",
    type: `FXL - LTR`
  },
  {
    link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}?free&vertical`,
    name: "Manga, vertical free scrolling",
    type: `FXL - LTR`
  },
  {
    link: `/reader/${btoa(`${window.location.origin}/epubs/rendition-flow-webtoon-one-page.epub`)}?free&vertical`,
    name: "Webtoon (one big image), vertical free scrolling",
    type: `FXL - LTR`
  },
  {
    link: `/reader/${btoa(`${window.location.origin}/epubs/rendition-flow-webtoon.epub`)}?free&vertical`,
    name: "Webtoon, vertical free scrolling",
    type: `FXL - LTR`
  }
]

export const EPUBS = [
  {
    name: `accessible_epub_3.epub`,
    type: `EN - LTR - RFL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/accessible_epub_3.epub`)}`
  },
  {
    name: `sous-le-vent.epub`,
    type: `EN - LTR - FXL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/sous-le-vent.epub`)}`
  },
  {
    name: `moby-dick_txt.txt`,
    type: `EN - LTR - TXT`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/moby-dick_txt.txt`)}`
  },

  {
    name: `sample.cbz`,
    type: `EN - LTR - FXL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/sample.cbz`)}`
  },
  {
    name: `cc-shared-culture.epub`,
    type: `EN - LTR - MEDIA`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/cc-shared-culture.epub`)}`
  },
  {
    name: `Accessibility-Tests-Mathematics.epub`,
    type: `EN - LTR - RFL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/Accessibility-Tests-Mathematics.epub`)}`
  },
  {
    name: `regime-anticancer-arabic.epub`,
    type: `AR - RTL - RFL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/regime-anticancer-arabic.epub`)}`
  },
  {
    name: `mymedia_lite.epub`,
    type: `JP - RTL - RFL`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/mymedia_lite.epub`)}`
  },
  {
    name: `haruko-html-jpeg.epub`,
    type: `JP - RTL - FXL(P)`,
    link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-html-jpeg.epub`)}`
  }
]
