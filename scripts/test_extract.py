import unittest
from types import SimpleNamespace
from unittest.mock import patch

import fitz

import extract


def text_block(text, x, y, heading=False):
    bbox = (x, y, x + 250, y + 16)
    span = {
        "text": text,
        "font": "MinionPro-Bold" if heading else "MinionPro-Regular",
        "size": 14 if heading else 11,
        "color": 0,
        "bbox": bbox,
    }
    return {"type": 0, "bbox": bbox, "lines": [{"bbox": bbox, "spans": [span]}]}


def image_block(x, y):
    return {
        "type": 1,
        "bbox": (x, y, x + 250, y + 150),
        "image": b"standalone figure",
        "ext": "png",
    }


class ColumnLeadingFigureTests(unittest.TestCase):
    def extract_sections(self, *pages):
        # Extra blank pages keep a single figure below the background threshold.
        document = [
            SimpleNamespace(
                rect=fitz.Rect(0, 0, 800, 800),
                get_text=lambda mode, blocks=blocks: {"blocks": blocks},
            )
            for blocks in [*pages, [], []]
        ]
        with (
            patch.object(extract.fitz, "open", return_value=document),
            patch.object(extract, "read_annotated_figures_for_doc", return_value=[]),
            patch.object(extract, "save_image", return_value="/figure.png"),
        ):
            return extract.extract(None, "test")

    def test_leading_figure_attaches_to_first_heading_in_its_column(self):
        sections = self.extract_sections([
            text_block("Rules", 40, 50, heading=True),
            text_block("Rule text.", 40, 80),
            image_block(440, 50),
            text_block("Example", 440, 220, heading=True),
            text_block("Example text.", 440, 250),
        ])
        self.assertEqual(sections[0]["content"], "Rule text.")
        self.assertEqual(
            sections[1]["content"], "![](/figure.png)\n\nExample text."
        )

    def test_leading_figure_before_continuation_stays_with_previous_section(self):
        sections = self.extract_sections([
            text_block("Rules", 40, 50, heading=True),
            text_block("Rule text.", 40, 80),
            image_block(440, 50),
            text_block("Continued rule text.", 440, 220),
            text_block("Example", 440, 260, heading=True),
        ])
        self.assertIn("![](/figure.png)", sections[0]["content"])
        self.assertIn("Continued rule text.", sections[0]["content"])
        self.assertEqual(sections[1]["content"], "")

    def test_trailing_figure_is_not_moved_to_the_next_column(self):
        sections = self.extract_sections([
            text_block("Rules", 40, 50, heading=True),
            text_block("Rule text.", 40, 80),
            image_block(40, 200),
            text_block("Example", 440, 50, heading=True),
        ])
        self.assertIn("![](/figure.png)", sections[0]["content"])
        self.assertEqual(sections[1]["content"], "")

    def test_figure_only_column_is_flushed_before_next_page(self):
        sections = self.extract_sections(
            [
                text_block("Rules", 40, 50, heading=True),
                text_block("Rule text.", 40, 80),
                image_block(440, 50),
            ],
            [text_block("Next Page", 40, 50, heading=True)],
        )
        self.assertIn("![](/figure.png)", sections[0]["content"])
        self.assertEqual(sections[1]["content"], "")


if __name__ == "__main__":
    unittest.main()
