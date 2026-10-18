"""Builds the browser suite's KOReader page fixtures, and prints the pages
MuPDF, which KOReader opens comics with, makes of the comic, which
comic.spec.ts lists as KOREADER_PAGES.

- koreader-pages.cbz: a comic whose images are named so that MuPDF and prose
  sort them alike, with two panoramas the cbz streamer hooks split in two:
  past the first, a half's spine index is not the panorama's place among the
  images, which the cbz enhancer writes in its cfi. Each image has a size of
  its own and shows its name, so a page identifies its entry in KOReader as
  in MuPDF.
- koreader-pages.pdf: four pages, each of a width of its own, showing its
  number.

    python3 -m venv /tmp/mupdf && /tmp/mupdf/bin/pip install pymupdf pillow
    /tmp/mupdf/bin/python -I build_page_fixtures.py <prose-reader>/apps/tests/public/epubs
"""

import io
import os
import sys
import zipfile

import pymupdf
from PIL import Image, ImageDraw, ImageFont

COMIC_ENTRIES = [
    "p01.jpg",
    "p02.jpg",
    "p03.jpg",
    "p04-05.jpg",
    "p06.jpg",
    "p07.jpg",
    "p08-09.jpg",
]

PAGE_HEIGHT = 900
PORTRAIT_WIDTH = 600
PANORAMA_WIDTH = 1200
WIDTH_STEP = 4


def is_panorama(name):
    return "-" in name


def image_width(name, index):
    base = PANORAMA_WIDTH if is_panorama(name) else PORTRAIT_WIDTH

    return base + WIDTH_STEP * index


def image(name, index):
    width = image_width(name, index)
    picture = Image.new("RGB", (width, PAGE_HEIGHT), (240 - 15 * index, 230, 200 + 5 * index))
    draw = ImageDraw.Draw(picture)
    draw.rectangle([10, 10, width - 10, PAGE_HEIGHT - 10], outline=(0, 0, 0), width=6)
    draw.text(
        (width / 2, PAGE_HEIGHT / 2),
        name,
        fill=(0, 0, 0),
        font=ImageFont.load_default(size=48),
        anchor="mm",
    )
    encoded = io.BytesIO()
    picture.save(encoded, "JPEG", quality=60)

    return encoded.getvalue()


def build_comic(path):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for index, name in enumerate(COMIC_ENTRIES):
            archive.writestr(name, image(name, index))


def mupdf_comic_pages(path):
    """The entry on each page MuPDF opens the comic with, told by its width."""
    entry_by_width = {
        image_width(name, index): name for index, name in enumerate(COMIC_ENTRIES)
    }
    document = pymupdf.open(path)

    return [
        entry_by_width[round(page.rect.width / page.rect.height * PAGE_HEIGHT)]
        for page in document
    ]


def build_pdf(path):
    document = pymupdf.open()

    for index in range(4):
        page = document.new_page(width=420 + 20 * index, height=595)
        page.insert_text((60, 300), f"Page {index + 1}", fontsize=48)

    document.set_metadata({"title": "KOReader pages"})
    document.save(path, garbage=4, deflate=True)


def main():
    if len(sys.argv) != 2:
        sys.stderr.write("usage: build_page_fixtures.py <fixtures dir>\n")
        sys.exit(1)

    comic_path = os.path.join(sys.argv[1], "koreader-pages.cbz")
    build_comic(comic_path)
    build_pdf(os.path.join(sys.argv[1], "koreader-pages.pdf"))

    pages = mupdf_comic_pages(comic_path)

    print(f"MuPDF {pymupdf.VersionBind} pages of {comic_path}:")
    for number, entry in enumerate(pages, start=1):
        print(f"  {number}: {entry}")

    if pages != COMIC_ENTRIES:
        sys.stderr.write("MuPDF does not order the comic as it is stored\n")
        sys.exit(1)


main()
