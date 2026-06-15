import { resolveOptionalRulebookLinks } from "@/lib/rulebook-links";
import { RulebookLinks } from "./RulebookLinks";

export async function OptionalRuleLinks({
  rules,
  heading = "Optional Rules",
  className = "",
}: {
  rules: string[];
  heading?: string;
  className?: string;
}) {
  const links = await resolveOptionalRulebookLinks(rules);

  return (
    <RulebookLinks links={links} heading={heading} className={className} />
  );
}
