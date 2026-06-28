import Link from "next/link";
import type { ReactNode } from "react";
import type { ClassEntry } from "@/lib/tts/lookup";

type ClassLinkEntry = Pick<ClassEntry, "name" | "slug" | "classes">;
type ClassCardHeadingLevel = "h2" | "h3" | "p";

export function classAbilityName(className: string, advantageTitle: string) {
  const prefix = `${className} (`;

  if (advantageTitle.startsWith(prefix) && advantageTitle.endsWith(")")) {
    return advantageTitle.slice(prefix.length, -1);
  }

  return advantageTitle;
}

export function ClassLink({
  entry,
  className,
}: {
  entry: ClassLinkEntry;
  className?: string;
}) {
  const ttsClass = entry.classes[0];
  const abilityName = ttsClass
    ? classAbilityName(entry.name, ttsClass.advantageTitle)
    : undefined;

  return (
    <Link
      href={`/classes/${entry.slug}`}
      className={["hover:underline", className].filter(Boolean).join(" ")}
    >
      <span className="font-semibold">{entry.name}</span>
      {abilityName && (
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          {" "}
          ({abilityName})
        </span>
      )}
    </Link>
  );
}

export function ClassCardLink({
  entry,
  className,
  headingLevel = "h2",
}: {
  entry: ClassLinkEntry;
  className?: string;
  headingLevel?: ClassCardHeadingLevel;
}) {
  const ttsClass = entry.classes[0];
  const label = <ClassLink entry={entry} />;

  return (
    <section
      className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}
    >
      <Link
        href={`/classes/${entry.slug}`}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.name}`}
      >
        {ttsClass?.classToken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ttsClass.classToken.imageURL}
            alt=""
            className="block w-full aspect-square object-cover"
          />
        ) : (
          <span className="block w-full aspect-square" />
        )}
      </Link>
      <div>{classCardHeading(headingLevel, label)}</div>
    </section>
  );
}

function classCardHeading(level: ClassCardHeadingLevel, label: ReactNode) {
  if (level === "h3") {
    return <h3 className="text-base">{label}</h3>;
  }

  if (level === "p") {
    return <p className="text-base">{label}</p>;
  }

  return <h2 className="text-base">{label}</h2>;
}
