"""Extract Dragons Down rulebooks into JSON with markdown content + extracted images.

Output:
    data/<name>.json — { version, content: [ { id, source, level, title, location, icon?, content (markdown) } ] }
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
    location: dict[str, int | str] | None = None
    icon: str | None = None
    content_parts: list[str] = field(default_factory=list)

    def render(self) -> dict:
        content = "\n\n".join(p for p in self.content_parts if p).strip()
        content = _WRAP_FIX.sub(r"\1\2\3\4", content)
        rendered = {"level": self.level, "title": self.title}
        if self.location:
            rendered["location"] = self.location
        if self.icon:
            rendered["icon"] = self.icon
        rendered["content"] = content
        return rendered


def classify_heading(font: str, size: float, color: int) -> int | None:
    size_r = round(size)
    if font == "BreatheFireIII" and size_r == 18:
        if color == RED:
            return 1
        if color == BROWN_DARK:
            return 2
        return None
    bold = font == "MinionPro-Bold"
    bold_it = font == "MinionPro-BoldIt"
    if not (bold or bold_it):
        return None
    # L3: size 16 brown; either variant (the newer PDFs italicize sub-labels
    # like "(Optional Player vs. Player Rule)").
    if size_r == 16 and color in BROWNS_MID:
        return 3
    # L4: size 14. Black accepts either variant (newer PDFs italicize the
    # parenthetical, e.g. "Dwarf (*Caver*)"); brown requires straight Bold
    # only — the BoldIt-brown spans we see are in-body emphasis like
    # "**far right**", not headings.
    if size_r == 14:
        if color in BLACKISH:
            return 4
        if color in BROWNS_MID and bold:
            return 4
    # L5: size 12 brown, Bold (not BoldIt). These are sub-headings inside L4
    # entries (e.g. action descriptions "Alert", "Sneak", "Move"). The black
    # size-12 spans ("Golden Rule:", "Place Tokens:") are in-body emphasis,
    # so this level only accepts brown.
    if size_r == 12 and color in BROWNS_MID and bold:
        return 5
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


def image_url_for_block(block: dict, stats: dict, total_pages: int) -> str | None:
    img_bytes = block.get("image")
    if not img_bytes:
        return None
    # Some PDFs contain mirrored/off-canvas image placements whose display
    # bbox has non-positive width/height. They are effectively invisible and
    # should not be emitted into extracted markdown.
    bx0, by0, bx1, by1 = block["bbox"]
    if (bx1 - bx0) <= 0 or (by1 - by0) <= 0:
        return None
    h = hashlib.sha1(img_bytes).hexdigest()
    stat = stats.get(h)
    if not stat or is_background(stat, total_pages):
        return None
    return save_image(h, stat)


def line_bbox(line: dict) -> tuple[float, float, float, float] | None:
    spans = [s for s in line.get("spans", []) if s.get("text", "").strip()]
    if not spans:
        return None
    return (
        min(s["bbox"][0] for s in spans),
        min(s["bbox"][1] for s in spans),
        max(s["bbox"][2] for s in spans),
        max(s["bbox"][3] for s in spans),
    )


def heading_key(level: int, title: str, bbox: tuple[float, float, float, float]) -> tuple:
    return (level, title, *(round(v, 1) for v in bbox))


def find_section_icons(
    blocks: list[dict], stats: dict, total_pages: int
) -> tuple[dict[tuple, str], set[int]]:
    """Detect section icons by their left-float geometry.

    The PDFs lay these out as small square-ish images at the column margin. Most
    have heading/body lines that begin to the right of the image, then resume at
    the normal column margin once below it. Some sections only indent the heading
    itself: the body starts below the icon, or there is no body at all.
    """
    image_blocks: list[tuple[int, str, tuple[float, float, float, float]]] = []
    for block in blocks:
        if block.get("type") != 1:
            continue
        url = image_url_for_block(block, stats, total_pages)
        if not url:
            continue
        ix0, iy0, ix1, iy1 = block["bbox"]
        width = ix1 - ix0
        height = iy1 - iy0
        if 24 <= width <= 90 and 24 <= height <= 90:
            image_blocks.append((id(block), url, block["bbox"]))

    icons_by_heading: dict[tuple, str] = {}
    icon_block_ids: set[int] = set()
    if not image_blocks:
        return icons_by_heading, icon_block_ids

    def nearby_body_lines(
        current_block: dict,
        current_line_idx: int,
        heading_box: tuple[float, float, float, float],
    ) -> list[tuple[float, float, float, float]]:
        lines: list[tuple[float, float, float, float]] = []
        for next_line in current_block.get("lines", [])[current_line_idx + 1 : current_line_idx + 6]:
            next_box = line_bbox(next_line)
            if next_box is None:
                continue
            next_spans = next_line.get("spans", [])
            next_dom = max(next_spans, key=lambda s: len(s["text"]))
            if classify_heading(next_dom["font"], next_dom["size"], next_dom["color"]) is not None:
                break
            lines.append(next_box)
        if lines:
            return lines

        _, _, hx1, hy1 = heading_box
        for other in blocks:
            if other is current_block or other.get("type") != 0:
                continue
            ox0, oy0, ox1, oy1 = other["bbox"]
            if oy0 < hy1 - 2 or oy0 > hy1 + 120:
                continue
            if ox1 < heading_box[0] or ox0 > hx1 + 240:
                continue
            for line in other.get("lines", [])[:6]:
                next_box = line_bbox(line)
                if next_box is None:
                    continue
                next_spans = line.get("spans", [])
                next_dom = max(next_spans, key=lambda s: len(s["text"]))
                if classify_heading(next_dom["font"], next_dom["size"], next_dom["color"]) is not None:
                    return lines
                lines.append(next_box)
            if lines:
                break
        return lines

    for block in blocks:
        if block.get("type") != 0:
            continue
        lines = block.get("lines", [])
        for line_idx, line in enumerate(lines):
            spans = line.get("spans", [])
            if not spans:
                continue
            dom = max(spans, key=lambda s: len(s["text"]))
            full_text = "".join(s["text"] for s in spans).strip()
            if not full_text or is_skippable_line(full_text, dom["font"], dom["size"]):
                continue
            level = classify_heading(dom["font"], dom["size"], dom["color"])
            if level is None:
                continue
            title = clean_title(full_text)
            hbox = line_bbox(line)
            if hbox is None:
                continue

            following_lines = nearby_body_lines(block, line_idx, hbox)
            hx0, hy0, hx1, hy1 = hbox
            for block_id, url, ibox in image_blocks:
                if block_id in icon_block_ids:
                    continue
                ix0, iy0, ix1, iy1 = ibox
                left_of_heading = ix1 <= hx0 + 4
                close_gap = 0 <= (hx0 - ix1) <= 18
                aligned_top = abs(iy0 - hy0) <= 12 or hy0 <= iy0 <= hy1 + 12
                plausible_margin = 30 <= (hx0 - ix0) <= 75
                heading_wraps = hx0 >= ix1 - 1 and hy0 < iy1
                wrapped_body_lines = [lb for lb in following_lines if lb[0] >= ix1 - 1]
                body_wraps = any(lb[1] < iy1 for lb in wrapped_body_lines)
                body_returns = any(
                    abs(lb[0] - ix0) <= 8 and lb[1] >= iy1 - 6
                    for lb in following_lines
                )
                short_fully_wrapped = (
                    bool(following_lines)
                    and len(wrapped_body_lines) == len(following_lines)
                    and max(lb[3] for lb in following_lines) <= iy1 + 36
                )
                heading_only_icon = not following_lines
                heading_wrapped_body_below = (
                    bool(following_lines)
                    and not body_wraps
                    and body_returns
                    and min(lb[1] for lb in following_lines) >= iy1 - 6
                )
                if (
                    left_of_heading
                    and close_gap
                    and aligned_top
                    and plausible_margin
                    and heading_wraps
                    and (
                        heading_only_icon
                        or heading_wrapped_body_below
                        or (body_wraps and (body_returns or short_fully_wrapped))
                    )
                ):
                    icons_by_heading[heading_key(level, title, hbox)] = url
                    icon_block_ids.add(block_id)
                    break
    return icons_by_heading, icon_block_ids


# Block processing -------------------------------------------------------------

def process_text_block(block: dict) -> list[tuple]:
    """Yield items: ('heading', level, title, key, bbox) | ('para', md) | ('bullets', md)."""
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
            title = clean_title(full_text)
            bbox = line_bbox(line) or block["bbox"]
            items.append(("heading", level, title, heading_key(level, title, bbox), bbox))
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
    url = image_url_for_block(block, stats, total_pages)
    if not url:
        return []
    return [("image", f"![]({url})")]


def block_sort_key(block: dict, column_boundary: float) -> tuple:
    """Sort blocks into reading order for a 2-column layout.

    Column membership is decided by the block's **center x** rather than its
    left edge. Wide blocks (e.g. a column-spanning run whose first glyph
    happens to land a few points before the midpoint) are correctly placed
    by where most of their content sits, not by the leftmost glyph.
    """
    x0, y0, x1, _ = block["bbox"]
    cx = (x0 + x1) / 2
    col = 0 if cx < column_boundary else 1
    return (col, y0, x0)


def find_column_boundary(blocks: list[dict], page_w: float) -> float:
    """Locate the gutter between the two text columns on a page.

    The static page-midpoint heuristic mis-classifies blocks whose left edge
    falls a hair on the wrong side of `page_w / 2`. Instead, look at every
    block's horizontal extent and find the widest vertical strip no block
    overlaps. The center of that gap is the column boundary.

    Falls back to `page_w / 2` when no clear gutter is found (single-column
    pages, cover art, etc.).
    """
    intervals: list[tuple[float, float]] = []
    for b in blocks:
        if b.get("type") not in (0, 1):
            continue
        x0, _, x1, _ = b["bbox"]
        if x1 > x0:
            intervals.append((x0, x1))
    if not intervals:
        return page_w / 2
    intervals.sort()
    merged: list[list[float]] = []
    for x0, x1 in intervals:
        if merged and x0 <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], x1)
        else:
            merged.append([x0, x1])
    best_gap = 0.0
    best_mid = page_w / 2
    for i in range(1, len(merged)):
        gap = merged[i][0] - merged[i - 1][1]
        if gap > best_gap:
            best_gap = gap
            best_mid = (merged[i][0] + merged[i - 1][1]) / 2
    # Only trust a gutter that's clearly more than typical inter-block padding.
    if best_gap >= 20:
        return best_mid
    return page_w / 2


def location_for_heading(
    page_number: int,
    bbox: tuple[float, float, float, float],
    column_boundary: float,
    page_h: float,
) -> dict[str, int | str]:
    x0, y0, x1, y1 = bbox
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    if cy < page_h / 3:
        page_section = "top"
    elif cy < (page_h * 2) / 3:
        page_section = "middle"
    else:
        page_section = "bottom"
    return {
        "page": page_number,
        "column": "left" if cx < column_boundary else "right",
        "section": page_section,
    }


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

    for page_idx, page in enumerate(doc):
        raw_blocks = page.get_text("dict")["blocks"]
        icons_by_heading, icon_block_ids = find_section_icons(
            raw_blocks, stats, total_pages
        )
        boundary = find_column_boundary(raw_blocks, page.rect.width)
        blocks = sorted(
            raw_blocks,
            key=lambda b: block_sort_key(b, boundary),
        )
        for block in blocks:
            btype = block.get("type")
            if btype == 0:
                items = process_text_block(block)
            elif btype == 1:
                if id(block) in icon_block_ids:
                    continue
                items = process_image_block(block, stats, total_pages)
            else:
                continue
            for item in items:
                kind = item[0]
                if kind == "image":
                    # Most images are tied to the currently active section.
                    # Buffer only when we have not seen any heading yet.
                    if current is None:
                        pending_images.append(item[1])
                    else:
                        push(item[1])
                elif kind == "heading":
                    _, level, title, key, bbox = item
                    if not title:
                        continue
                    current = Section(
                        level=level,
                        title=title,
                        location=location_for_heading(
                            page_idx + 1,
                            bbox,
                            boundary,
                            page.rect.height,
                        ),
                        icon=icons_by_heading.get(key),
                    )
                    sections.append(current)
                    # Attach any pending images to the new section
                    flush_pending_to_current()
                else:  # 'para' or 'bullets'
                    flush_pending_to_current()
                    push(item[1])
        # End of page: trailing images usually belong to the section that was
        # active on this page. Flushing here avoids cross-page mis-assignment
        # where a positioned image gets attached to an unrelated heading on
        # the next page.
        if current is not None:
            flush_pending_to_current()

    # End of doc: flush remaining
    flush_pending_to_current()

    rendered = [s.render() for s in sections if s.title]
    assign_ids(rendered)
    return rendered


_MAX_LEVEL = 5


def assign_ids(sections: list[dict]) -> None:
    """Assign hierarchical ids in place. Examples: "1", "2.1", "2.1.0.1".

    A "0" placeholder fills slots for skipped levels (e.g. L2 -> L4 yields
    `X.Y.0.Z`) so the digit count always equals the section's level.
    """
    counters = [0] * _MAX_LEVEL
    for s in sections:
        lvl = s["level"]
        counters[lvl - 1] += 1
        for i in range(lvl, _MAX_LEVEL):
            counters[i] = 0
        s["id"] = ".".join(str(c) for c in counters[:lvl])


def parse_stem(stem: str) -> tuple[str, str]:
    """Split a PDF filename stem into (name, version).

    `core_1.2`            -> ("core", "1.2")
    `eastern_reaches_1.0` -> ("eastern_reaches", "1.0")
    `nameless`            -> ("nameless", "")

    `name` is the filename-style identifier (underscores intact); use
    `slug_for_url` to turn it into the hyphenated URL slug.
    """
    match = re.match(r"^(.*?)_(\d+\.\d+)$", stem)
    if match:
        return match.group(1), match.group(2)
    return stem, ""


def slug_for_url(name: str) -> str:
    """`eastern_reaches` -> `eastern-reaches`."""
    return name.replace("_", "-")


def process_one(pdf: Path, out: Path | None = None) -> None:
    sections = extract(pdf)
    name, version = parse_stem(pdf.stem)
    slug = slug_for_url(name)
    # Stamp `source` on every section and put identifier fields first for
    # readable JSON output.
    stamped_sections = []
    for s in sections:
        section = {
            "id": s["id"],
            "source": slug,
            "level": s["level"],
            "title": s["title"],
        }
        if location := s.get("location"):
            section["location"] = location
        if icon := s.get("icon"):
            section["icon"] = icon
        section["content"] = s["content"]
        stamped_sections.append(section)
    sections = stamped_sections
    payload = {"version": version, "content": sections}
    out_path = out if out is not None else OUT_DIR / f"{name}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"{pdf.name}: {len(sections)} sections (v{version or '?'}) → {out_path}")


def main(argv: list[str]) -> None:
    if not argv or argv[0] == "--all":
        for pdf in sorted(PDF_DIR.glob("*.pdf")):
            process_one(pdf)
        return
    pdf = Path(argv[0])
    out = Path(argv[1]) if len(argv) > 1 else None
    process_one(pdf, out)


if __name__ == "__main__":
    main(sys.argv[1:])
