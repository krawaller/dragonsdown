import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { PageHeader } from "@/components/PageHeader";
import {
  getAllMerchantDetailSlugs,
  getMerchantDetail,
} from "@/lib/entities/merchants";
import type { MerchantTokenDetail } from "@/lib/entities/types";

export function generateStaticParams() {
  return getAllMerchantDetailSlugs().map((slug) => ({ slug }));
}

export default async function MerchantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchant = getMerchantDetail(slug);
  if (!merchant) notFound();
  const { entry } = merchant;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle="Merchant"
        categories={merchant.categories}
      />

      <div className="space-y-6">
        <BoardPositionLinks
          boards={merchant.boards}
          itemName={entry.name}
          className=""
          showHeading={false}
          showCaption={false}
          linked={false}
          displaySides="both"
          collapsibleTitle="Board Position"
        />

        <CollapsibleBox
          title="Related Missions"
          count={merchant.missions.length}
          countLabel={`${merchant.missions.length} mission${merchant.missions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={merchant.missions} />
        </CollapsibleBox>

        <MerchantTokensBox merchant={merchant} />
      </div>
    </main>
  );
}

function MerchantTokensBox({
  merchant,
}: {
  merchant: NonNullable<ReturnType<typeof getMerchantDetail>>;
}) {
  return (
    <CollapsibleBox
      title="Tokens"
      count={merchant.tokens.length}
      countLabel={merchant.totalTokensLabel}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {merchant.tokens.map((token) => (
          <MerchantTokenCard key={token.key} token={token} />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function MerchantTokenCard({ token }: { token: MerchantTokenDetail }) {
  return (
    <Link href={token.href} className="group flex min-w-0 flex-col gap-2">
      <div className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.imageUrl}
          alt={token.alt}
          className="block aspect-square w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold group-hover:underline">
          Civilisation token
        </h2>
      </div>
    </Link>
  );
}
