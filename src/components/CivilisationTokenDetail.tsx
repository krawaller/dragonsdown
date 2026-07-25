import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { MissionLinks } from "@/components/MissionLinks";
import {
  getBoardsForMerchant,
  getMissionsForTarget,
  type CivilisationTokenListEntry,
  type CivilisationTokenNameEntry,
} from "@/lib/tts/lookup";

export function CivilisationTokenDetail({
  entry,
}: {
  entry: CivilisationTokenNameEntry;
}) {
  const total = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );
  const boards = getBoardsForMerchant(entry.name);
  const missions = getMissionsForTarget(entry.name);

  return (
    <>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entry.tokens.length} images · {total} physical tokens
      </p>

      <BoardPositionLinks boards={boards} itemName={entry.name} />

      <MissionLinks missions={missions} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {entry.tokens.map((token) => (
          <section
            key={`${token.terrainGroup}-${token.displayName}-${token.imageSecondaryURL}`}
            className="flex flex-col gap-2"
          >
            <div className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={token.imageSecondaryURL || token.imageURL}
                alt={civilisationTokenImageAlt(token)}
                className="block w-full aspect-square object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold">{token.terrainGroup}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {civilisationTokenDetails(token)} · {tokenTotalCount(token)}{" "}
                total
              </p>
            </div>
            <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {token.locations.map((location) => (
                <li key={`${location.ancestry.join("/")}-${location.count}`}>
                  {location.ancestry.length > 0
                    ? location.ancestry.join(" / ")
                    : "Loose"}
                  {" · "}
                  {location.count}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function civilisationTokenDetails(token: CivilisationTokenListEntry): string {
  const parts = [token.attribute, token.gmNotes].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : token.terrainGroup;
}

function civilisationTokenImageAlt(token: CivilisationTokenListEntry): string {
  if (token.terrainGroup === token.displayName) return token.displayName;
  return `${token.displayName} ${token.terrainGroup}`;
}

function tokenTotalCount(token: CivilisationTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}
