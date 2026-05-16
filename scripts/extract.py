"""Extract Dragons Down rulebooks into a flat list of { level, title, content }.

Heading conventions (verified across all 4 PDFs):
  L1: BreatheFireIII size 18, color #d2232a  (red — page-section banners)
  L2: BreatheFireIII size 18, color #4b281c  (brown — subsections)
  L3: MinionPro-Bold  size 16, brown         (used sparsely)
  L4: MinionPro-Bold  size 14, black/dark    (entries: classes, treasures...)

Usage: python scripts/extract.py pdf/<file>.pdf [out.json]
       python scripts/extract.py --all
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import fitz

PDF_DIR = Path(__file__).resolve().parent.parent / "pdf"
OUT_DIR = Path(__file__).resolve().parent.parent / "data"

RED = 0xD2232A
BROWN_DARK = 0x4B281C
BROWNS_MID = {0x744610, 0x784A1D, 0xAE6D38}
BLACKISH = {0x000000, 0x231F20}


@dataclass
class Section:
    level: int
    title: str
    content: str = ""


@dataclass
class Line:
    text: str
    size: float
    font: str
    color: int
    y: float
    flags: int = 0


def classify_heading(line: Line) -> int | None:
    size = round(line.size)
    if line.font == "BreatheFireIII" and size == 18:
        if line.color == RED:
            return 1
        if line.color == BROWN_DARK:
            return 2
        return None
    if line.font == "MinionPro-Bold" and size == 16 and line.color in BROWNS_MID:
        return 3
    if line.font == "MinionPro-Bold" and size == 14 and line.color in BLACKISH:
        return 4
    return None


def is_skippable(line: Line) -> bool:
    size = round(line.size, 1)
    # Version stamp at the bottom of cover pages
    if size <= 6:
        return True
    # Page numbers
    if line.font == "BreatheFireIII" and round(line.size) == 16:
        return True
    # TOC entries (size 18 in a non-heading font, often with \x08 leader chars)
    if round(line.size) == 18 and line.font != "BreatheFireIII":
        return True
    # Copyright footer
    if "Copyright" in line.text and "Active Magic Games" in line.text:
        return True
    if line.text.startswith("(C) Copyright"):
        return True
    return False


def page_lines(page: fitz.Page) -> list[Line]:
    """Return a page's lines in reading order, each line as a single Line.

    PyMuPDF gives blocks roughly in reading order for column layouts; we sort
    by (column_index, y, x) to be safe.
    """
    raw = page.get_text("dict")
    page_w = page.rect.width
    col_threshold = page_w / 2

    items: list[tuple[int, float, float, Line]] = []
    for block in raw["blocks"]:
        if block.get("type") != 0:
            continue
        for line_data in block["lines"]:
            spans = line_data["spans"]
            if not spans:
                continue
            # Dominant span = the one with the most characters.
            dom = max(spans, key=lambda s: len(s["text"]))
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            x0, y0, x1, y1 = line_data["bbox"]
            col = 0 if x0 < col_threshold else 1
            line = Line(
                text=text,
                size=dom["size"],
                font=dom["font"],
                color=dom["color"],
                y=y0,
                flags=dom.get("flags", 0),
            )
            items.append((col, y0, x0, line))

    items.sort(key=lambda t: (t[0], t[1], t[2]))
    return [line for _, _, _, line in items]


def extract(pdf_path: Path) -> list[Section]:
    doc = fitz.open(pdf_path)
    sections: list[Section] = []
    current: Section | None = None
    body_buf: list[str] = []

    def flush_body() -> None:
        nonlocal body_buf
        if current is None or not body_buf:
            body_buf = []
            return
        text = " ".join(body_buf)
        text = re.sub(r"\s+", " ", text).strip()
        if current.content:
            current.content = (current.content + " " + text).strip()
        else:
            current.content = text
        body_buf = []

    for page in doc:
        for line in page_lines(page):
            if is_skippable(line):
                continue
            level = classify_heading(line)
            if level is not None:
                flush_body()
                current = Section(level=level, title=clean_title(line.text))
                sections.append(current)
            else:
                body_buf.append(line.text)
    flush_body()

    # Drop empty sections at the very start (e.g. cover-page artifacts) only if
    # they have no content AND nothing under them.
    return [s for s in sections if s.title]


def clean_title(text: str) -> str:
    # Strip TOC leader chars and trailing page numbers if any leaked through.
    text = text.replace("\x08", " ")
    return re.sub(r"\s+", " ", text).strip()


def to_dicts(sections: list[Section]) -> list[dict]:
    return [{"level": s.level, "title": s.title, "content": s.content} for s in sections]


def process_one(pdf_path: Path, out_path: Path) -> None:
    sections = extract(pdf_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(to_dicts(sections), indent=2, ensure_ascii=False))
    print(f"{pdf_path.name}: {len(sections)} sections → {out_path}")


def main(argv: list[str]) -> None:
    if not argv or argv[0] == "--all":
        for pdf in sorted(PDF_DIR.glob("*.pdf")):
            out = OUT_DIR / (pdf.stem + ".json")
            process_one(pdf, out)
        return
    pdf = Path(argv[0])
    out = Path(argv[1]) if len(argv) > 1 else OUT_DIR / (pdf.stem + ".json")
    process_one(pdf, out)


if __name__ == "__main__":
    main(sys.argv[1:])
