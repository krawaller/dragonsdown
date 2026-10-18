import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { PageHeader } from "@/components/PageHeader";
import {
  getAllCivLocationDetailSlugs,
  getCivLocationDetail,
} from "@/lib/entities/civ-locations";

export function generateStaticParams() {
  return getAllCivLocationDetailSlugs().map((slug) => ({ slug }));
}

export default async function CivLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const civLocation = getCivLocationDetail(slug);
  if (!civLocation) notFound();

  const { name, location } = civLocation.entry;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        title={name}
        subtitle={civLocation.subtitle}
        categories={civLocation.categories}
      />
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.imageURL}
          alt={name}
          className="block w-full max-h-[78vh] aspect-square object-contain"
        />
      </div>
      <div className="mt-8">
        <CollapsibleBox
          title="Native Groups"
          count={civLocation.nativeGroups.length}
          countLabel={`${civLocation.nativeGroups.length} group${civLocation.nativeGroups.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {civLocation.nativeGroups.map((group) => (
              <MonsterGroupStack
                key={group.slug}
                group={group}
                hrefBase="/natives"
              />
            ))}
          </div>
        </CollapsibleBox>
      </div>
      <div className="mt-8">
        <CollapsibleBox
          title="Related Missions"
          count={civLocation.missions.length}
          countLabel={`${civLocation.missions.length} mission${civLocation.missions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={civLocation.missions} />
        </CollapsibleBox>
      </div>
    </main>
  );
}
