import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RulebookLinks } from "@/components/RulebookLinks";
import { getActionBySlug, getAllActions } from "@/lib/actions";

export async function generateStaticParams() {
  const actions = await getAllActions();
  return actions.map((entry) => ({ slug: entry.slug }));
}

export default async function ActionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const action = await getActionBySlug(slug);
  if (!action) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/actions" className="hover:underline">
          Actions
        </Link>
      </div>

      <div className="mt-4 mb-8 flex items-center gap-4">
        {action.icon && (
          <Image
            src={action.icon}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 object-contain"
          />
        )}
        <h1 className="text-4xl font-bold">{action.name}</h1>
      </div>

      <RulebookLinks links={action.rulebookLinks} heading="Rulebook" />
    </main>
  );
}
