import { describe, expect, it } from "vitest";
import { contentNodesForMarkdown, markdownFromContentNodes } from "./rulebooks";

describe("contentNodesForMarkdown", () => {
  it("groups leading floated images with their paragraph", () => {
    const nodes = contentNodesForMarkdown(
      "![float-left](/images/pdf/icon.png) **Price:** This paragraph owns the image.\n\nNext paragraph.",
    );

    expect(nodes).toEqual([
      {
        kind: "mediaAside",
        images: [
          {
            kind: "image",
            src: "/images/pdf/icon.png",
            display: "float-left",
          },
        ],
        markdown: "**Price:** This paragraph owns the image.",
      },
      { kind: "markdown", markdown: "Next paragraph." },
    ]);
    expect(markdownFromContentNodes(nodes)).toBe(
      "![float-left](/images/pdf/icon.png) **Price:** This paragraph owns the image.\n\nNext paragraph.",
    );
  });
});
