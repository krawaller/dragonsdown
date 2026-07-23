"""Extract Dragons Down rulebooks into JSON with markdown content + extracted images.

Output:
    data/parsed-pdf/<name>.json — { version, content: [ { id, source, level, title, location, icon?, content (markdown) } ] }
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
PDF_DIR = ROOT / "data" / "downloaded-pdf"
RELEASES_FILE = ROOT / "data" / "manual" / "releases.json"
ANNOTATED_FIGURES_FILE = ROOT / "data" / "manual" / "annotated-figures.json"
OUT_DIR = ROOT / "data" / "parsed-pdf"
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
_INLINE_IMAGE_REF = r"!\[inline\]\([^)]*\)"
_LEADING_LEFT_FLOAT_RE = re.compile(
    r"^!\[(float-left|float-left-companion)\]\(([^)]*)\)(?:\s+|$)"
)


def normalize_inline_image_spacing(content: str) -> str:
    if "![inline](" not in content:
        return content
    content = re.sub(rf"\s*\n\s*\n\s*({_INLINE_IMAGE_REF})\s*", r" \1 ", content)
    content = re.sub(rf"({_INLINE_IMAGE_REF})\s*\n\s*\n\s*", r"\1 ", content)
    return re.sub(r" {2,}", " ", content).strip()


@dataclass
class Section:
    level: int
    title: str
    heading_style: str | None = None
    location: dict[str, int | str] | None = None
    icon: str | None = None
    icons: list[str] = field(default_factory=list)
    content_parts: list[str] = field(default_factory=list)

    def render(self) -> dict:
        content = render_content_parts(self.content_parts)
        content = normalize_inline_image_spacing(content)
        content = _WRAP_FIX.sub(r"\1\2\3\4", content)
        rendered = {"level": self.level, "title": self.title}
        if self.heading_style:
            rendered["headingStyle"] = self.heading_style
        if self.location:
            rendered["location"] = self.location
        icons = [*([] if self.icon is None else [self.icon]), *self.icons]
        if len(icons) == 1:
            rendered["icon"] = icons[0]
        elif icons:
            rendered["icons"] = icons
        rendered["content"] = content
        return rendered

    def promote_leading_float_icons(self, md: str) -> str:
        if self.content_parts or not md.startswith("![float-left"):
            return md

        remaining = md
        promoted: list[str] = []
        while match := _LEADING_LEFT_FLOAT_RE.match(remaining):
            marker, url = match.groups()
            if marker == "float-left-companion" and not promoted:
                break
            promoted.append(url)
            remaining = remaining[match.end() :].lstrip()

        if promoted:
            self.icons.extend(promoted)
            return remaining
        return md


def render_content_parts(parts: list[str]) -> str:
    rendered: list[str] = []
    for part in (p.strip() for p in parts if p.strip()):
        if rendered and should_flow_across_part_boundary(rendered[-1], part):
            rendered[-1] = f"{rendered[-1]} {part}"
        else:
            rendered.append(part)
    return "\n\n".join(rendered).strip()


def should_flow_across_part_boundary(previous: str, current: str) -> bool:
    previous = previous.rstrip()
    current = current.lstrip()
    if not previous or not current:
        return False
    if starts_structural_markdown(current):
        return False
    if not starts_lowercase_continuation(current):
        return False
    if re.search(r"[.!?:;][)'\]’”\"*]*$", previous):
        return False
    return True


def starts_structural_markdown(markdown: str) -> bool:
    return bool(
        re.match(
            r"^(?:[-*+]\s+|\d+[.)]\s+|!\[[^\]]*\]\([^)]*\)|\*\*[^*\n]+:\*\*)",
            markdown,
        )
    )


def starts_lowercase_continuation(markdown: str) -> bool:
    text = re.sub(r"^[*_`\s]+", "", markdown)
    return bool(text and text[0].islower())


@dataclass
class ReleaseEntry:
    file: str
    version: str | None = None


@dataclass(frozen=True)
class AnnotatedFigure:
    doc: str
    page: int
    title_regex: str
    bbox: tuple[float, float, float, float]
    alt: str
    expected_texts: tuple[str, ...]
    placement: str = "append"


@dataclass(frozen=True)
class InlineImage:
    x0: float
    x1: float
    markdown: str
    block_id: int


@dataclass(frozen=True)
class TextLine:
    line: dict
    bbox: tuple[float, float, float, float]


@dataclass(frozen=True)
class FloatedImage:
    x0: float
    x1: float
    markdown: str
    block_id: int


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


def heading_strength(level: int) -> int:
    return level * 10


def heading_style_for_level(level: int) -> str:
    return f"pdf-l{level}"


def classify_standalone_body_heading_strength(
    text: str, spans: list[dict]
) -> int | None:
    visible_spans = [span for span in spans if span["text"].strip()]
    if not visible_spans or text == "•":
        return None
    if len(text) > 80 or text.endswith((".", ")")):
        return None
    if not all(span["font"] == "MinionPro-Bold" for span in visible_spans):
        return None
    if not all(round(span["size"]) in {11, 12} for span in visible_spans):
        return None
    if not all(span["color"] in BLACKISH for span in visible_spans):
        return None
    sizes = {round(span["size"]) for span in visible_spans}
    if sizes == {12}:
        return 60
    if sizes == {11}:
        return 70
    return None


def span_signature(span: dict) -> tuple[str, int, int]:
    return (span["font"], round(span["size"]), span["color"])


def visible_spans(line: dict) -> list[dict]:
    return [span for span in line.get("spans", []) if span.get("text", "").strip()]


def heading_level_for_line(line: dict) -> int | None:
    spans = visible_spans(line)
    if not spans:
        return None
    first_level = classify_heading(
        spans[0]["font"], spans[0]["size"], spans[0]["color"]
    )
    if first_level is not None and first_level <= 3:
        return first_level
    if first_level is not None and all(
        classify_heading(span["font"], span["size"], span["color"]) is not None
        for span in spans
    ):
        return first_level
    dom = max(spans, key=lambda s: len(s["text"]))
    return classify_heading(dom["font"], dom["size"], dom["color"])


def line_text(line: dict) -> str:
    return "".join(span["text"] for span in line.get("spans", [])).strip()


def line_reaches_block_right_edge(line: dict, block_bbox: tuple) -> bool:
    bbox = line_bbox(line)
    return bbox is not None and bbox[2] >= block_bbox[2] - 2


def is_wrapped_body_heading_candidate(
    lines: list[dict], line_idx: int, block_bbox: tuple
) -> bool:
    line = lines[line_idx]
    spans = visible_spans(line)
    if not spans:
        return False

    if line_idx > 0:
        previous_spans = visible_spans(lines[line_idx - 1])
        if (
            previous_spans
            and line_reaches_block_right_edge(lines[line_idx - 1], block_bbox)
            and starts_lowercase_continuation(line_text(line))
            and span_signature(previous_spans[-1]) == span_signature(spans[0])
        ):
            return True

    if line_idx + 1 < len(lines):
        next_spans = visible_spans(lines[line_idx + 1])
        if (
            next_spans
            and line_reaches_block_right_edge(line, block_bbox)
            and starts_lowercase_continuation(line_text(lines[line_idx + 1]))
            and span_signature(spans[-1]) == span_signature(next_spans[0])
        ):
            return True

    return False


def is_skippable_line(text: str, font: str, size: float) -> bool:
    if round(size, 1) <= 6:
        return True
    if font == "BreatheFireIII" and round(size) == 16:
        return True  # page numbers
    if round(size) == 18 and font != "BreatheFireIII":
        return True  # TOC entries (contain \x08 leaders)
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


def render_spans_md(
    spans: list[dict],
    skip_leading_bullet: bool = False,
    inline_images: list[InlineImage] | None = None,
    leading_images: list[FloatedImage] | None = None,
) -> str:
    """Merge adjacent same-style spans, wrap each run in markdown emphasis.

    If skip_leading_bullet is true, drop the first span if it is just '•'.
    """
    parts: list[str] = []
    buf = ""
    buf_style: str | None = None
    dropped_bullet = not skip_leading_bullet
    images = sorted(inline_images or [], key=lambda img: (img.x0 + img.x1) / 2)
    image_idx = 0

    def append_text(text: str, style: str) -> None:
        nonlocal buf, buf_style
        if not text:
            return
        if style == buf_style:
            buf += text
        else:
            if buf:
                parts.append(wrap_style(buf, buf_style or ""))
            buf = text
            buf_style = style

    def append_image(markdown: str) -> None:
        nonlocal buf, buf_style
        if buf:
            parts.append(wrap_style(buf, buf_style or ""))
            buf = ""
            buf_style = None
        if parts and not parts[-1].endswith((" ", "\n")):
            parts.append(" ")
        parts.append(markdown)
        parts.append(" ")

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
        sx0, _, sx1, _ = span["bbox"]
        while image_idx < len(images) and images[image_idx].x1 <= sx0:
            append_image(images[image_idx].markdown)
            image_idx += 1

        in_span: list[tuple[int, InlineImage]] = []
        while image_idx < len(images):
            image = images[image_idx]
            center_x = (image.x0 + image.x1) / 2
            if center_x > sx1:
                break
            if sx1 > sx0 and text:
                split_idx = round(((center_x - sx0) / (sx1 - sx0)) * len(text))
            else:
                split_idx = len(text)
            split_idx = max(0, min(len(text), split_idx))
            visible_end = len(text.rstrip())
            if visible_end < len(text) and split_idx >= visible_end:
                split_idx = visible_end
            in_span.append((split_idx, image))
            image_idx += 1

        if not in_span:
            append_text(text, style)
            continue

        start = 0
        for split_idx, image in sorted(in_span, key=lambda entry: entry[0]):
            append_text(text[start:split_idx], style)
            append_image(image.markdown)
            start = split_idx
        append_text(text[start:], style)

    while image_idx < len(images):
        append_image(images[image_idx].markdown)
        image_idx += 1
    if buf:
        parts.append(wrap_style(buf, buf_style or ""))
    leading = [image.markdown for image in leading_images or []]
    rendered = " ".join([*leading, "".join(parts)]) if leading else "".join(parts)
    return re.sub(r" {2,}", " ", rendered) if images else rendered


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


def save_page_crop(page: fitz.Page, bbox: tuple[float, float, float, float]) -> str:
    pix = page.get_pixmap(
        matrix=fitz.Matrix(2, 2),
        clip=fitz.Rect(*bbox),
        alpha=False,
    )
    img_bytes = pix.tobytes("png")
    h = hashlib.sha1(img_bytes).hexdigest()
    out = IMG_DIR / f"{h}.png"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(img_bytes)
    return f"{IMG_URL_PREFIX}/{h}.png"


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


def vertical_overlap(
    a: tuple[float, float, float, float],
    b: tuple[float, float, float, float],
) -> float:
    return max(0.0, min(a[3], b[3]) - max(a[1], b[1]))


def text_lines_for_image_detection(blocks: list[dict]) -> list[TextLine]:
    lines: list[TextLine] = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            full_text = "".join(s["text"] for s in spans).strip()
            if not full_text:
                continue
            dom = max(spans, key=lambda s: len(s["text"]))
            if is_skippable_line(full_text, dom["font"], dom["size"]):
                continue
            if heading_level_for_line(line) is not None:
                continue
            bbox = line_bbox(line)
            if bbox is not None:
                lines.append(TextLine(line=line, bbox=bbox))
    return lines


def same_column(
    a: tuple[float, float, float, float],
    b: tuple[float, float, float, float],
    column_boundary: float,
) -> bool:
    acx = (a[0] + a[2]) / 2
    bcx = (b[0] + b[2]) / 2
    return (acx < column_boundary) == (bcx < column_boundary)


def line_starts_with_bold_label(line: dict) -> bool:
    spans = [s for s in line.get("spans", []) if s.get("text", "")]
    first = next((s for s in spans if s.get("text", "").strip()), None)
    if first is None or "Bold" not in first["font"]:
        return False
    text = "".join(s.get("text", "") for s in spans).strip()
    return bool(re.match(r"^[A-Z][A-Za-z /-]{1,40}:\s", text))


def find_inline_images(
    blocks: list[dict],
    stats: dict,
    total_pages: int,
    excluded_block_ids: set[int],
) -> tuple[dict[int, list[InlineImage]], set[int]]:
    text_lines = text_lines_for_image_detection(blocks)

    inline_by_line: dict[int, list[InlineImage]] = {}
    inline_block_ids: set[int] = set()
    for block in blocks:
        if block.get("type") != 1 or id(block) in excluded_block_ids:
            continue
        url = image_url_for_block(block, stats, total_pages)
        if not url:
            continue
        ix0, iy0, ix1, iy1 = block["bbox"]
        width = ix1 - ix0
        height = iy1 - iy0
        if not (6 <= width <= 28 and 6 <= height <= 28):
            continue
        ibox = (ix0, iy0, ix1, iy1)
        best: tuple[float, dict] | None = None
        for text_line in text_lines:
            line = text_line.line
            lbox = text_line.bbox
            lx0, ly0, lx1, ly1 = lbox
            overlap = vertical_overlap(ibox, lbox)
            if overlap / min(height, ly1 - ly0) < 0.45:
                continue
            within_or_gap = ix0 <= lx1 + 4 and ix1 >= lx0 - 4
            near_text_flow = ix0 <= lx1 + 12 or ix0 <= lx1 <= ix1 + 4
            if not (within_or_gap and near_text_flow):
                continue
            score = overlap - abs(((iy0 + iy1) / 2) - ((ly0 + ly1) / 2))
            if best is None or score > best[0]:
                best = (score, line)
        if best is None:
            continue
        _, line = best
        inline_by_line.setdefault(id(line), []).append(
            InlineImage(ix0, ix1, f"![inline]({url})", id(block))
        )
        inline_block_ids.add(id(block))
    return inline_by_line, inline_block_ids


def find_floated_images(
    blocks: list[dict],
    stats: dict,
    total_pages: int,
    excluded_block_ids: set[int],
    column_boundary: float,
) -> tuple[dict[int, list[FloatedImage]], set[int]]:
    """Detect body figures that text wraps around.

    `excluded_block_ids` must include section-icon blocks. Headline-adjacent
    left-floated images are handled by `find_section_icons` and should remain
    `section.icon`, never markdown body images.
    """
    text_lines = text_lines_for_image_detection(blocks)
    image_blocks: list[tuple[dict, str, tuple[float, float, float, float]]] = []
    for image_block in blocks:
        if image_block.get("type") != 1 or id(image_block) in excluded_block_ids:
            continue
        url = image_url_for_block(image_block, stats, total_pages)
        if not url:
            continue
        ix0, iy0, ix1, iy1 = image_block["bbox"]
        width = ix1 - ix0
        height = iy1 - iy0
        if 28 <= width <= 180 and 28 <= height <= 220:
            image_blocks.append((image_block, url, (ix0, iy0, ix1, iy1)))

    def companion_images(
        anchor_block: dict,
        anchor_box: tuple[float, float, float, float],
        direction: str,
    ) -> list[tuple[dict, str, tuple[float, float, float, float]]]:
        companions: list[tuple[dict, str, tuple[float, float, float, float]]] = []
        ax0, ay0, ax1, ay1 = anchor_box
        for candidate_block, candidate_url, candidate_box in image_blocks:
            if candidate_block is anchor_block or id(candidate_block) in floated_block_ids:
                continue
            cx0, cy0, cx1, cy1 = candidate_box
            if not same_column(anchor_box, candidate_box, column_boundary):
                continue
            if abs(cy0 - ay0) > 8 or abs(cy1 - ay1) > 8:
                continue
            if direction == "left" and 0 <= ax0 - cx1 <= 12:
                companions.append((candidate_block, candidate_url, candidate_box))
            elif direction == "right" and 0 <= cx0 - ax1 <= 12:
                companions.append((candidate_block, candidate_url, candidate_box))
        return companions

    floated_by_line: dict[int, list[FloatedImage]] = {}
    floated_block_ids: set[int] = set()
    for block, url, ibox in image_blocks:
        if id(block) in floated_block_ids:
            continue
        ix0, iy0, ix1, iy1 = ibox
        height = iy1 - iy0
        left_lines: list[TextLine] = []
        right_lines: list[TextLine] = []
        for text_line in text_lines:
            lbox = text_line.bbox
            lx0, ly0, lx1, ly1 = lbox
            if not same_column(ibox, lbox, column_boundary):
                continue
            overlap = vertical_overlap(ibox, lbox)
            if overlap / min(height, ly1 - ly0) < 0.25:
                continue
            left_gap = lx0 - ix1
            right_gap = ix0 - lx1
            if 0 <= left_gap <= 28:
                left_lines.append(text_line)
            elif 0 <= right_gap <= 28:
                right_lines.append(text_line)

        direction: str | None = None
        wrapped_lines: list[TextLine] = []
        left_labeled_single = (
            len(left_lines) == 1 and line_starts_with_bold_label(left_lines[0].line)
        )
        right_labeled_single = (
            len(right_lines) == 1
            and line_starts_with_bold_label(right_lines[0].line)
        )
        if (len(left_lines) >= 2 or left_labeled_single) and len(left_lines) >= len(right_lines):
            direction = "left"
            wrapped_lines = left_lines
        elif len(right_lines) >= 2 or right_labeled_single:
            direction = "right"
            wrapped_lines = right_lines
        if direction is None:
            continue

        wrapped_lines.sort(key=lambda entry: (entry.bbox[1], entry.bbox[0]))
        first_line = wrapped_lines[0].line
        run = companion_images(block, ibox, direction) + [(block, url, ibox)]
        run.sort(key=lambda entry: entry[2][0], reverse=direction == "right")
        for index, (run_block, run_url, run_box) in enumerate(run):
            marker = f"float-{direction}" if index == 0 else f"float-{direction}-companion"
            rx0, _, rx1, _ = run_box
            floated_by_line.setdefault(id(first_line), []).append(
                FloatedImage(rx0, rx1, f"![{marker}]({run_url})", id(run_block))
            )
            floated_block_ids.add(id(run_block))
    return floated_by_line, floated_block_ids


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
            if heading_level_for_line(next_line) is not None:
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
                if heading_level_for_line(line) is not None:
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
            level = heading_level_for_line(line)
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

def process_text_block(
    block: dict,
    inline_by_line: dict[int, list[InlineImage]] | None = None,
    floated_by_line: dict[int, list[FloatedImage]] | None = None,
) -> list[tuple]:
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

    lines = block["lines"]
    for line_idx, line in enumerate(lines):
        spans = line["spans"]
        if not spans:
            continue
        dom = max(spans, key=lambda s: len(s["text"]))
        full_text = "".join(s["text"] for s in spans).strip()
        if not full_text:
            continue
        if is_skippable_line(full_text, dom["font"], dom["size"]):
            continue
        level = heading_level_for_line(line)
        strength = heading_strength(level) if level is not None else None
        if level is None:
            strength = classify_standalone_body_heading_strength(full_text, spans)
            if strength is not None and is_wrapped_body_heading_candidate(
                lines, line_idx, block["bbox"]
            ):
                strength = None
        if level is not None:
            flush_para()
            flush_bullets()
            title = clean_title(full_text)
            bbox = line_bbox(line) or block["bbox"]
            items.append(
                ("heading", level, title, strength, heading_style_for_level(level), bbox)
            )
            continue
        if strength is not None:
            flush_para()
            flush_bullets()
            title = clean_title(full_text)
            bbox = line_bbox(line) or block["bbox"]
            style = "pdf-body-bold-12" if strength == 60 else "pdf-body-bold-11"
            items.append(("heading", None, title, strength, style, bbox))
            continue
        first_visible = next((s for s in spans if s["text"].strip()), None)
        is_bullet = first_visible is not None and first_visible["text"].strip() == "•"
        if is_bullet:
            flush_para()
            md = render_spans_md(
                spans,
                skip_leading_bullet=True,
                inline_images=(inline_by_line or {}).get(id(line)),
                leading_images=(floated_by_line or {}).get(id(line)),
            ).strip()
            bullets_buf.append(md)
            continue
        md = render_spans_md(
            spans,
            inline_images=(inline_by_line or {}).get(id(line)),
            leading_images=(floated_by_line or {}).get(id(line)),
        ).strip()
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


def is_full_width_page_footer(block: dict, page_rect: fitz.Rect) -> bool:
    if block.get("type") != 0:
        return False
    x0, y0, x1, _ = block["bbox"]
    width = x1 - x0
    page_width = page_rect.width
    if width < page_width * 0.7 or y0 < page_rect.height * 0.82:
        return False
    return x0 <= page_width * 0.16 and x1 >= page_width * 0.84


def footer_logo_candidates(
    blocks: list[dict], footer_block: dict, page_rect: fitz.Rect
) -> list[dict]:
    footer_x0, footer_y0, footer_x1, _ = footer_block["bbox"]
    candidates: list[dict] = []
    for block in blocks:
        if block.get("type") != 1:
            continue
        x0, y0, x1, y1 = block["bbox"]
        width = x1 - x0
        height = y1 - y0
        gap = footer_y0 - y1
        horizontally_within_footer = x0 >= footer_x0 and x1 <= footer_x1
        if (
            50 <= width <= 160
            and 50 <= height <= 180
            and 0 <= gap <= page_rect.height * 0.05
            and y0 >= page_rect.height * 0.7
            and horizontally_within_footer
        ):
            candidates.append(block)
    return sorted(candidates, key=lambda block: (block["bbox"][0], block["bbox"][1]))


def page_block_sort_key(block: dict, column_boundary: float, page_rect: fitz.Rect) -> tuple:
    if is_full_width_page_footer(block, page_rect):
        _, y0, x1, _ = block["bbox"]
        return (2, y0, x1)
    col, y0, x0 = block_sort_key(block, column_boundary)
    return (col, y0, x0)


def footer_location_for_block(
    page_number: int, block: dict, page_h: float
) -> dict[str, int | str]:
    _, y0, _, y1 = block["bbox"]
    cy = (y0 + y1) / 2
    if cy < page_h / 3:
        page_section = "top"
    elif cy < (page_h * 2) / 3:
        page_section = "middle"
    else:
        page_section = "bottom"
    return {"page": page_number, "column": "full", "section": page_section}


def block_is_inside_figure(block: dict, figure: AnnotatedFigure) -> bool:
    bx0, by0, bx1, by1 = block["bbox"]
    if bx1 <= bx0 or by1 <= by0:
        return False
    fx0, fy0, fx1, fy1 = figure.bbox
    return bx0 >= fx0 and by0 >= fy0 and bx1 <= fx1 and by1 <= fy1


def block_is_inside_any_figure(block: dict, figures: list[AnnotatedFigure]) -> bool:
    return any(block_is_inside_figure(block, figure) for figure in figures)


def block_text(block: dict) -> str:
    if block.get("type") != 0:
        return ""
    return " ".join(
        "".join(span.get("text", "") for span in line.get("spans", [])).strip()
        for line in block.get("lines", [])
        if "".join(span.get("text", "") for span in line.get("spans", [])).strip()
    )


def normalize_expected_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def validate_annotated_figure_texts(
    blocks: list[dict], figure: AnnotatedFigure
) -> None:
    if not figure.expected_texts:
        return
    swallowed_text = normalize_expected_text(
        " ".join(
            block_text(block)
            for block in blocks
            if block.get("type") == 0 and block_is_inside_figure(block, figure)
        )
    )
    missing = [
        text
        for text in figure.expected_texts
        if normalize_expected_text(text) not in swallowed_text
    ]
    if missing:
        raise ValueError(
            "Annotated figure crop did not contain expected text(s): "
            f"doc={figure.doc} page={figure.page} target={figure.title_regex} "
            f"missing={missing} bbox={figure.bbox} found={swallowed_text!r}"
        )


def read_annotated_figures_for_doc(doc_slug: str) -> list[AnnotatedFigure]:
    if not ANNOTATED_FIGURES_FILE.exists():
        return []
    data = json.loads(ANNOTATED_FIGURES_FILE.read_text())
    if not isinstance(data, list):
        raise TypeError(
            f"Annotated figures file must be an array: {ANNOTATED_FIGURES_FILE}"
        )

    figures: list[AnnotatedFigure] = []
    for index, entry in enumerate(data):
        if not isinstance(entry, dict):
            raise TypeError(f"Annotated figure entry #{index + 1} must be an object")
        doc = entry.get("doc")
        if doc != doc_slug:
            continue
        target = entry.get("target")
        bbox = entry.get("bbox")
        page = entry.get("page")
        alt = entry.get("alt", "Annotated figure")
        expected_texts = entry.get("expectedTexts", [])
        placement = entry.get("placement", "append")
        if not isinstance(doc, str):
            raise TypeError(f"Annotated figure entry #{index + 1} is missing doc")
        if not isinstance(page, int):
            raise TypeError(f"Annotated figure entry #{index + 1} is missing integer page")
        if not isinstance(target, dict) or not isinstance(target.get("titleRegex"), str):
            raise TypeError(
                f"Annotated figure entry #{index + 1} target must include titleRegex"
            )
        if (
            not isinstance(bbox, list)
            or len(bbox) != 4
            or not all(isinstance(value, int | float) for value in bbox)
        ):
            raise TypeError(
                f"Annotated figure entry #{index + 1} bbox must be four numbers"
            )
        if not isinstance(alt, str):
            raise TypeError(f"Annotated figure entry #{index + 1} alt must be a string")
        if not isinstance(expected_texts, list) or not all(
            isinstance(text, str) for text in expected_texts
        ):
            raise TypeError(
                f"Annotated figure entry #{index + 1} expectedTexts must be strings"
            )
        if placement != "append":
            raise ValueError(
                f"Annotated figure entry #{index + 1} has unsupported placement: {placement}"
            )
        figures.append(
            AnnotatedFigure(
                doc=doc,
                page=page,
                title_regex=target["titleRegex"],
                bbox=tuple(float(value) for value in bbox),
                alt=alt,
                expected_texts=tuple(expected_texts),
                placement=placement,
            )
        )
    return figures


def append_annotated_figures(
    sections: list[Section],
    figures: list[AnnotatedFigure],
    figure_markdown: dict[AnnotatedFigure, str],
) -> None:
    for figure in figures:
        markdown = figure_markdown.get(figure)
        if markdown is None:
            continue
        title_re = re.compile(figure.title_regex)
        target = next((section for section in sections if title_re.search(section.title)), None)
        if target is None:
            print(
                f"Warning: annotated figure target not found: "
                f"{figure.doc} {figure.title_regex}",
                file=sys.stderr,
            )
            continue
        target.content_parts.append(markdown)


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


def extract(pdf_path: Path, doc_slug: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    stats = collect_image_stats(doc)
    total_pages = len(doc)
    annotated_figures = read_annotated_figures_for_doc(doc_slug)
    figures_by_page: dict[int, list[AnnotatedFigure]] = {}
    for figure in annotated_figures:
        figures_by_page.setdefault(figure.page, []).append(figure)
    figure_markdown: dict[AnnotatedFigure, str] = {}
    sections: list[Section] = []
    current: Section | None = None
    heading_strengths: list[int | None] = [None] * _MAX_LEVEL

    def resolve_heading_level(level: int | None, strength: int) -> int:
        if level is not None:
            return level
        parent_level = 0
        for idx, previous_strength in enumerate(heading_strengths):
            if previous_strength is not None and previous_strength < strength:
                parent_level = idx + 1
        return min(parent_level + 1, _MAX_LEVEL)

    def remember_heading(level: int, strength: int) -> None:
        heading_strengths[level - 1] = strength
        for idx in range(level, _MAX_LEVEL):
            heading_strengths[idx] = None

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
        page_figures = figures_by_page.get(page_idx + 1, [])
        for figure in page_figures:
            validate_annotated_figure_texts(raw_blocks, figure)
            url = save_page_crop(page, figure.bbox)
            figure_markdown[figure] = f"![{figure.alt}]({url})"
        raw_blocks = [
            block
            for block in raw_blocks
            if not block_is_inside_any_figure(block, page_figures)
        ]
        # Preserve the existing section-icon system first. Those image blocks
        # are intentionally excluded from generic inline/float markdown passes.
        icons_by_heading, icon_block_ids = find_section_icons(
            raw_blocks, stats, total_pages
        )
        boundary = find_column_boundary(raw_blocks, page.rect.width)
        inline_by_line, inline_block_ids = find_inline_images(
            raw_blocks, stats, total_pages, icon_block_ids
        )
        floated_by_line, floated_block_ids = find_floated_images(
            raw_blocks,
            stats,
            total_pages,
            icon_block_ids | inline_block_ids,
            boundary,
        )
        footer_images_by_block: dict[int, list[dict]] = {}
        footer_image_block_ids: set[int] = set()
        for block in raw_blocks:
            if not is_full_width_page_footer(block, page.rect):
                continue
            footer_images = footer_logo_candidates(raw_blocks, block, page.rect)
            if footer_images:
                footer_images_by_block[id(block)] = footer_images
                footer_image_block_ids.update(id(image) for image in footer_images)
        blocks = sorted(
            raw_blocks,
            key=lambda b: page_block_sort_key(b, boundary, page.rect),
        )
        for block in blocks:
            btype = block.get("type")
            is_footer = is_full_width_page_footer(block, page.rect)
            if btype == 0:
                items = process_text_block(block, inline_by_line, floated_by_line)
            elif btype == 1:
                if (
                    id(block) in icon_block_ids
                    or id(block) in inline_block_ids
                    or id(block) in floated_block_ids
                    or id(block) in footer_image_block_ids
                ):
                    continue
                items = process_image_block(block, stats, total_pages)
            else:
                continue
            if is_footer:
                footer = Section(
                    level=1,
                    title="Credits",
                    location=footer_location_for_block(
                        page_idx + 1, block, page.rect.height
                    ),
                )
                sections.append(footer)
                previous = current
                current = footer
                for footer_image in footer_images_by_block.get(id(block), []):
                    for item in process_image_block(footer_image, stats, total_pages):
                        push(item[1])
                for item in items:
                    kind = item[0]
                    if kind == "para":
                        push(item[1])
                    elif kind == "bullets":
                        push(item[1])
                current = previous
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
                    _, raw_level, title, strength, heading_style, bbox = item
                    if not title:
                        continue
                    level = resolve_heading_level(raw_level, strength)
                    key = heading_key(level, title, bbox)
                    current = Section(
                        level=level,
                        title=title,
                        heading_style=heading_style,
                        location=location_for_heading(
                            page_idx + 1,
                            bbox,
                            boundary,
                            page.rect.height,
                        ),
                        icon=icons_by_heading.get(key),
                    )
                    sections.append(current)
                    remember_heading(level, strength)
                    # Attach any pending images to the new section
                    flush_pending_to_current()
                elif kind == "para":
                    flush_pending_to_current()
                    if current is not None:
                        push(current.promote_leading_float_icons(item[1]))
                else:  # 'bullets'
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

    append_annotated_figures(sections, annotated_figures, figure_markdown)

    rendered = [s.render() for s in sections if s.title]
    assign_ids(rendered)
    return rendered


_MAX_LEVEL = 8


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


def process_one(
    pdf: Path,
    out: Path | None = None,
    name_override: str | None = None,
    version_override: str | None = None,
) -> None:
    parsed_name, version = parse_stem(pdf.stem)
    name = name_override or parsed_name
    version = version_override if version_override is not None else version
    slug = slug_for_url(name)
    sections = extract(pdf, slug)
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
        if heading_style := s.get("headingStyle"):
            section["headingStyle"] = heading_style
        if location := s.get("location"):
            section["location"] = location
        if icon := s.get("icon"):
            section["icon"] = icon
        if icons := s.get("icons"):
            section["icons"] = icons
        section["content"] = s["content"]
        stamped_sections.append(section)
    sections = stamped_sections
    payload = {"version": version, "content": sections}
    out_path = out if out is not None else OUT_DIR / f"{name}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"{pdf.name}: {len(sections)} sections (v{version or '?'}) → {out_path}")


def read_releases() -> dict[str, ReleaseEntry]:
    if not RELEASES_FILE.exists():
        raise FileNotFoundError(f"Missing releases file: {RELEASES_FILE}")
    data = json.loads(RELEASES_FILE.read_text())
    if not isinstance(data, dict):
        raise TypeError(f"Releases file must be an object: {RELEASES_FILE}")
    releases: dict[str, ReleaseEntry] = {}
    for name, entry in data.items():
        if not isinstance(name, str):
            raise TypeError(f"Release keys must be strings: {RELEASES_FILE}")
        if isinstance(entry, str):
            releases[name] = ReleaseEntry(file=entry)
            continue
        if not isinstance(entry, dict):
            raise TypeError(f"Release entries must be strings or objects: {RELEASES_FILE}")
        filename = entry.get("file")
        version = entry.get("version")
        if not isinstance(filename, str):
            raise TypeError(f"Release entry is missing string file: {name}")
        if version is not None and not isinstance(version, str):
            raise TypeError(f"Release entry has non-string version: {name}")
        releases[name] = ReleaseEntry(file=filename, version=version)
    return releases


def process_all() -> None:
    for name, entry in sorted(read_releases().items()):
        pdf = PDF_DIR / entry.file
        if not pdf.exists():
            raise FileNotFoundError(f"Mapped PDF does not exist: {pdf}")
        process_one(pdf, name_override=name, version_override=entry.version)


def main(argv: list[str]) -> None:
    if not argv or argv[0] == "--all":
        process_all()
        return
    pdf = Path(argv[0])
    out = Path(argv[1]) if len(argv) > 1 else None
    process_one(pdf, out)


if __name__ == "__main__":
    main(sys.argv[1:])
