import ReactMarkdown from "react-markdown";
import { isValidElement, type ReactNode } from "react";
import type {
  Section,
  SectionContentNode,
  SectionImageDisplay,
} from "@/lib/rulebooks";
import {
  markdownBlockAnchorFor,
  markdownBlockMatchesAnchor,
  sectionContentAnchorIdFor,
} from "@/lib/rulebook-anchors";

export function RulebookContent({
  nodes,
  section,
}: {
  nodes: SectionContentNode[];
  section?: Section;
}) {
  return nodes.map((node, index) => {
    if (node.kind === "image") {
      return (
        <RulebookImage
          key={`${node.src}-${index}`}
          src={node.src}
          display={node.display}
        />
      );
    }
    if (node.kind === "mediaAside") {
      return (
        <div key={index} className="clear-both flow-root">
          {node.images.map((image, imageIndex) => (
            <RulebookImage
              key={`${image.src}-${imageIndex}`}
              src={image.src}
              display={image.display}
            />
          ))}
          <ReactMarkdown
            components={{
              img: MarkdownImage,
              li: (props) => MarkdownListItem({ ...props, section }),
              p: (props) =>
                MarkdownParagraph({ ...props, section, className: "mt-0" }),
              strong: (props) => MarkdownStrong({ ...props, section }),
            }}
          >
            {node.markdown}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <ReactMarkdown
        key={index}
        components={{
          img: MarkdownImage,
          li: (props) => MarkdownListItem({ ...props, section }),
          p: (props) => MarkdownParagraph({ ...props, section }),
          strong: (props) => MarkdownStrong({ ...props, section }),
        }}
      >
        {node.markdown}
      </ReactMarkdown>
    );
  });
}

function MarkdownParagraph({
  children,
  className,
  section,
}: {
  children?: ReactNode;
  className?: string;
  section?: Section;
}) {
  const text = textFromNode(children);
  const anchor = paragraphAnchorFor(text);
  return (
    <p
      id={
        section && anchor
          ? sectionContentAnchorIdFor(section, anchor)
          : undefined
      }
      className={[className, section && anchor ? "scroll-mt-6" : undefined]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}

function MarkdownListItem({
  children,
  section,
}: {
  children?: ReactNode;
  section?: Section;
}) {
  const text = textFromNode(children);
  const anchor = markdownBlockAnchorFor(`- ${text}`);
  return (
    <li
      id={
        section && anchor
          ? sectionContentAnchorIdFor(section, anchor)
          : undefined
      }
      className={section && anchor ? "scroll-mt-6" : undefined}
    >
      {children}
    </li>
  );
}

function MarkdownStrong({
  children,
  section,
}: {
  children?: ReactNode;
  section?: Section;
}) {
  const text = textFromNode(children);
  const anchor = text.match(/^(.*):$/)?.[1]?.trim();
  return (
    <strong
      id={
        section && anchor
          ? sectionContentAnchorIdFor(section, anchor)
          : undefined
      }
      className={section && anchor ? "scroll-mt-6" : undefined}
    >
      {children}
    </strong>
  );
}

function paragraphAnchorFor(text: string): string | undefined {
  const sentence = text.match(/^(.+?[.!?])(?:\s|$)/)?.[1]?.trim();
  if (!sentence) return undefined;
  return markdownBlockMatchesAnchor(text, sentence) ? sentence : undefined;
}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }
  return "";
}

/* eslint-disable @next/next/no-img-element */
function MarkdownImage({ alt, src }: { alt?: string; src?: string | Blob }) {
  if (typeof src !== "string") return null;
  const display = imageDisplayFromAlt(alt ?? "");
  return <RulebookImage src={src} display={display} />;
}

function RulebookImage({
  src,
  display,
}: {
  src: string;
  display: "inline" | SectionImageDisplay;
}) {
  return <img src={src} alt="" className={imageClassName(display)} />;
}
/* eslint-enable @next/next/no-img-element */

function imageDisplayFromAlt(alt: string) {
  if (
    alt === "float-left" ||
    alt === "float-left-companion" ||
    alt === "float-right" ||
    alt === "float-right-companion"
  ) {
    return alt;
  }
  if (alt === "inline") return "inline";
  return "block";
}

function imageClassName(
  display: ReturnType<typeof imageDisplayFromAlt>,
): string | undefined {
  const isFloatLeft =
    display === "float-left" || display === "float-left-companion";
  const isFloatRight =
    display === "float-right" || display === "float-right-companion";
  const shouldClear = display === "float-left" || display === "float-right";
  const clearClass = shouldClear ? "clear-both " : "";

  if (display === "inline") {
    return "not-prose inline-block h-[1.35em] w-auto align-[-0.2em]";
  }
  if (isFloatLeft) {
    return `not-prose ${clearClass}float-left mr-4 mb-2 mt-1 h-16 w-16 object-contain`;
  }
  if (isFloatRight) {
    return `not-prose ${clearClass}float-right ml-4 mb-2 mt-1 h-16 w-16 object-contain`;
  }
  return undefined;
}
