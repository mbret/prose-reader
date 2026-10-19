"""Builds twelve-pages.pdf, the PDF tests/pdf/pages.spec.ts opens: twelve
pages, page N reading "Page N". Twelve, so that some come past the tenth:
`createArchiveFromPdf` names the record of a page by its index, and from the
eleventh page on the name of one ends the name of another (`10.pdf` ends
`0.pdf`).

The output is the same on every run: the file carries no generated ID.

    python3 -m venv /tmp/mupdf && /tmp/mupdf/bin/pip install pymupdf
    /tmp/mupdf/bin/python -I build_twelve_pages_pdf.py <prose-reader>/apps/tests/public/epubs
"""

import os
import sys

import pymupdf

NUMBER_OF_PAGES = 12
PAGE_WIDTH = 420
PAGE_HEIGHT = 595


def build(output_path):
    document = pymupdf.open()

    for page_number in range(1, NUMBER_OF_PAGES + 1):
        page = document.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
        page.insert_text((60, 300), f"Page {page_number}", fontsize=48)

    document.set_metadata({"title": "Twelve pages"})
    document.save(output_path, garbage=4, deflate=True, no_new_id=True)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(f"usage: {sys.argv[0]} <fixtures directory>")

    build(os.path.join(sys.argv[1], "twelve-pages.pdf"))
