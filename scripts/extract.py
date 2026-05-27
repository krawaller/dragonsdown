"""Extract Dragons Down rulebooks into JSON with markdown content + extracted images.

Output:
  data/<stem>.json — array of { level, title, content (markdown) }
  public/images/pdf/<sha1>.<ext> — extracted, deduplicated, referenced as /images/pdf/<sha1>.<ext>

Heading conventions (verified across all 4 PDFs):
  L1: BreatheFireIII size 18, color #d2232a  (red — page-section banners)
  L2: BreatheFireIII size 18, color #4b281c  (brown — subsections)
  L3: MinionPro-Bold  size 16, brown         (used sparsely)
  L4: MinionPro-Bold  size 14, black/dark    (entries: classes, treasures...)

Inline markdown:
  MinionPro-Bold (size 11) -> **bold**
  MinionPro-It   (size 11) -> *italic*
  Lines beginning with '•' -> '- ' bullet list items

Image filtering:
  Skipped if the image covers >70% of any page it appears on (page backgrounds)
  or appears on >50% of pages (repeated parchment textures).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "pdf"
OUT_DIR = ROOT / "data"
IMG_DIR = ROOT / "public" / "images" / "pdf"
IMG_URL_PREFIX = "/images/pdf"

RED = 0xD2232A
BROWN_DARK = 0x4B281C
BROWNS_MID = {0x744610, 0x784A1D, 0xAE6D38}
BLACKISH = {0x000000, 0x231F20}

BG_COVERAGE_THRESHOLD = 0.7
BG_PAGE_FRACTION = 0.5


# Matches PDF line-wrap artifacts: a word ending in `-` or `/` followed by a
# space and another word. Uses [ \t]+ (not \s+) so it never spans paragraph
# breaks. Tolerates markdown emphasis asterisks on either side of the gap.
_WRAP_FIX = re.compile(r"([A-Za-z0-9][-/])(\*{0,3})[ \t]+(\*{0,3})([A-Za-z])")


@dataclass
class Section:
    level: int
    title: str
    content_parts: list[str] = field(default_factory=list)

    def render(self) -> dict:
        content = "\n\n".join(p for p in self.content_parts if p).strip()
        content = _WRAP_FIX.sub(r"\1\2\3\4", content)
        return {"level": self.level, "title": self.title, "content": content}


def classify_heading(font: str, size: float, color: int) -> int | None:
    size_r = round(size)
    if font == "BreatheFireIII" and size_r == 18:
        if color == RED:
            return 1
        if color == BROWN_DARK:
            return 2
        return None
    if font == "MinionPro-Bold" and size_r == 16 and color in BROWNS_MID:
        return 3
    if font == "MinionPro-Bold" and size_r == 14 and color in BLACKISH:
        return 4
    return None


def is_skippable_line(text: str, font: str, size: float) -> bool:
    if round(size, 1) <= 6:
        return True
    if font == "BreatheFireIII" and round(size) == 16:
        return True  # page numbers
    if round(size) == 18 and font != "BreatheFireIII":
        return True  # TOC entries (contain \x08 leaders)
    if text.startswith("(C) Copyright"):
        return True
    if "Copyright" in text and "Active Magic Games" in text:
        return True
    return False


def span_style(span: dict) -> str:
    font = span["font"]
    is_bold = "Bold" in font
    is_italic = "It" in font or "Italic" in font
    if is_bold and is_italic:
        return "bi"
    if is_bold:
        return "b"
    if is_italic:
        return "i"
    return ""


def wrap_style(text: str, style: str) -> str:
    if not style or not text.strip():
        return text
    leading = text[: len(text) - len(text.lstrip())]
    trailing = text[len(text.rstrip()) :]
    body = text.strip()
    if style == "b":
        body = f"**{body}**"
    elif style == "i":
        body = f"*{body}*"
    elif style == "bi":
        body = f"***{body}***"
    return leading + body + trailing


def render_spans_md(spans: list[dict], skip_leading_bullet: bool = False) -> str:
    """Merge adjacent same-style spans, wrap each run in markdown emphasis.

    If skip_leading_bullet is true, drop the first span if it is just '•'.
    """
    parts: list[str] = []
    buf = ""
    buf_style: str | None = None
    dropped_bullet = not skip_leading_bullet
    for span in spans:
        text = span["text"]
        if not text:
            continue
        if not dropped_bullet:
            if text.strip() == "•":
                dropped_bullet = True
                continue
            dropped_bullet = True
        style = span_style(span)
        if style == buf_style:
            buf += text
        else:
            if buf:
                parts.append(wrap_style(buf, buf_style or ""))
            buf = text
            buf_style = style
    if buf:
        parts.append(wrap_style(buf, buf_style or ""))
    return "".join(parts)


def clean_title(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\x08", " ")).strip()


# Image handling ---------------------------------------------------------------

def collect_image_stats(doc: fitz.Document) -> dict[str, dict]:
    stats: dict[str, dict] = {}
    for page_idx, page in enumerate(doc):
        page_area = page.rect.width * page.rect.height
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 1:
                continue
            img_bytes = block.get("image")
            if not img_bytes:
                continue
            h = hashlib.sha1(img_bytes).hexdigest()
            bx0, by0, bx1, by1 = block["bbox"]
            area = max(0.0, (bx1 - bx0) * (by1 - by0))
            cov = area / page_area if page_area else 0.0
            entry = stats.setdefault(
                h,
                {
                    "pages": set(),
                    "max_coverage": 0.0,
                    "ext": block.get("ext", "png"),
                    "bytes": img_bytes,
                },
            )
            entry["pages"].add(page_idx)
            entry["max_coverage"] = max(entry["max_coverage"], cov)
    return stats


def is_background(stat: dict, total_pages: int) -> bool:
    if stat["max_coverage"] > BG_COVERAGE_THRESHOLD:
        return True
    if total_pages > 0 and len(stat["pages"]) / total_pages > BG_PAGE_FRACTION:
        return True
    return False


def save_image(h: str, stat: dict) -> str:
    ext = stat["ext"] or "png"
    out = IMG_DIR / f"{h}.{ext}"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(stat["bytes"])
    return f"{IMG_URL_PREFIX}/{h}.{ext}"


# Block processing -------------------------------------------------------------

def process_text_block(block: dict) -> list[tuple]:
    """Yield items: ('heading', level, title) | ('para', md) | ('bullets', md)."""
    items: list[tuple] = []
    para_buf: list[str] = []
    bullets_buf: list[str] = []

    def flush_para() -> None:
        if para_buf:
            items.append(("para", " ".join(s for s in para_buf if s).strip()))
            para_buf.clear()

    def flush_bullets() -> None:
        if bullets_buf:
            md = "\n".join(f"- {b.strip()}" for b in bullets_buf if b.strip())
            if md:
                items.append(("bullets", md))
            bullets_buf.clear()

    for line in block["lines"]:
        spans = line["spans"]
        if not spans:
            continue
        dom = max(spans, key=lambda s: len(s["text"]))
        full_text = "".join(s["text"] for s in spans).strip()
        if not full_text:
            continue
        if is_skippable_line(full_text, dom["font"], dom["size"]):
            continue
        level = classify_heading(dom["font"], dom["size"], dom["color"])
        if level is not None:
            flush_para()
            flush_bullets()
            items.append(("heading", level, clean_title(full_text)))
            continue
        first_visible = next((s for s in spans if s["text"].strip()), None)
        is_bullet = first_visible is not None and first_visible["text"].strip() == "•"
        if is_bullet:
            flush_para()
            md = render_spans_md(spans, skip_leading_bullet=True).strip()
            bullets_buf.append(md)
            continue
        md = render_spans_md(spans).strip()
        if bullets_buf:
            # Wrapped continuation of the previous bullet item
            bullets_buf[-1] = (bullets_buf[-1] + " " + md).strip()
        else:
            para_buf.append(md)

    flush_para()
    flush_bullets()
    return items


def process_image_block(block: dict, stats: dict, total_pages: int) -> list[tuple]:
    img_bytes = block.get("image")
    if not img_bytes:
        return []
    h = hashlib.sha1(img_bytes).hexdigest()
    stat = stats.get(h)
    if not stat or is_background(stat, total_pages):
        return []
    url = save_image(h, stat)
    return [("image", f"![]({url})")]


def block_sort_key(block: dict, page_w: float) -> tuple:
    x0, y0, *_ = block["bbox"]
    col = 0 if x0 < page_w / 2 else 1
    return (col, y0, x0)


def extract(pdf_path: Path) -> list[dict]:
    doc = fitz.open(pdf_path)
    stats = collect_image_stats(doc)
    total_pages = len(doc)
    sections: list[Section] = []
    current: Section | None = None

    def push(md: str) -> None:
        if current is not None and md:
            current.content_parts.append(md)

    pending_images: list[str] = []  # buffered to allow attachment to next heading

    def flush_pending_to_current() -> None:
        for img in pending_images:
            push(img)
        pending_images.clear()

    for page in doc:
        blocks = sorted(
            page.get_text("dict")["blocks"],
            key=lambda b: block_sort_key(b, page.rect.width),
        )
        for block in blocks:
            btype = block.get("type")
            if btype == 0:
                items = process_text_block(block)
            elif btype == 1:
                items = process_image_block(block, stats, total_pages)
            else:
                continue
            for item in items:
                kind = item[0]
                if kind == "image":
                    pending_images.append(item[1])
                elif kind == "heading":
                    _, level, title = item
                    if not title:
                        continue
                    current = Section(level=level, title=title)
                    sections.append(current)
                    # Attach any pending images to the new section
                    flush_pending_to_current()
                else:  # 'para' or 'bullets'
                    flush_pending_to_current()
                    push(item[1])
        # End of page: any trailing images stay buffered for the next page's
        # first item to decide attachment (heading vs current section).

    # End of doc: flush remaining
    flush_pending_to_current()

    rendered = [s.render() for s in sections if s.title]
    assign_ids(rendered)
    return rendered


def assign_ids(sections: list[dict]) -> None:
    """Assign hierarchical ids in place. Examples: "1", "2.1", "2.1.0.1".

    A "0" placeholder fills slots for skipped levels (e.g. L2 -> L4 yields
    `X.Y.0.Z`) so the digit count always equals the section's level.
    """
    counters = [0, 0, 0, 0]
    for s in sections:
        lvl = s["level"]
        counters[lvl - 1] += 1
        for i in range(lvl, 4):
            counters[i] = 0
        s["id"] = ".".join(str(c) for c in counters[:lvl])


def derive_slug(stem: str) -> str:
    """Convert a PDF filename stem into a URL slug.

    `core_1.2`            -> `core`
    `eastern_reaches_1.0` -> `eastern-reaches`

    Strips a trailing `_<digits>.<digits>` version suffix, then swaps `_` for `-`.
    """
    return re.sub(r"_\d+\.\d+$", "", stem).replace("_", "-")


def process_one(pdf: Path, out: Path) -> None:
    sections = extract(pdf)
    slug = derive_slug(pdf.stem)
    # Stamp `source` on every section and put identifier fields first for
    # readable JSON output.
    sections = [
        {
            "id": s["id"],
            "source": slug,
            "level": s["level"],
            "title": s["title"],
            "content": s["content"],
        }
        for s in sections
    ]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(sections, indent=2, ensure_ascii=False))
    print(f"{pdf.name}: {len(sections)} sections → {out}")


def main(argv: list[str]) -> None:
    if not argv or argv[0] == "--all":
        for pdf in sorted(PDF_DIR.glob("*.pdf")):
            process_one(pdf, OUT_DIR / (pdf.stem + ".json"))
        return
    pdf = Path(argv[0])
    out = Path(argv[1]) if len(argv) > 1 else OUT_DIR / (pdf.stem + ".json")
    process_one(pdf, out)


if __name__ == "__main__":
    main(sys.argv[1:])
