import Image from "next/image";
import Link from "next/link";
import { getAllActions } from "@/lib/actions";

export default async function ActionsPage() {
  const actions = await getAllActions();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Actions</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {actions.length} actions with rulebook references
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {actions.map((action) => (
          <Link
            key={action.slug}
            href={`/actions/${action.slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-4">
              <ActionIcon action={action} size={48} />
              <div>
                <h2 className="text-lg font-semibold">{action.name}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {action.rulebookLinks.length} link
                  {action.rulebookLinks.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function ActionIcon({
  action,
  size,
}: {
  action: { name: string; icon?: string };
  size: number;
}) {
  if (!action.icon) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-zinc-200 text-lg font-semibold text-zinc-400 dark:border-zinc-800">
        {action.name.charAt(0)}
      </span>
    );
  }

  return (
    <Image
      src={action.icon}
      alt=""
      width={size}
      height={size}
      className="h-12 w-12 shrink-0 object-contain"
    />
  );
}
