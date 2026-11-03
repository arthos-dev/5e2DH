// Stable adversary ids: "<name>--<book>" slugs, e.g. "frost-giant--mm25" or "acid-burrower--daggerheart".
// They survive re-running the converter, so saved encounters, shared links and the Storm King's Codex can refer to them.
// Same name and book twice gets -2, -3… in input order.
export const slug = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function assignStableIds(adversaries) {
  const seen = new Map();
  for (const a of adversaries) {
    const base = `${slug(a.name)}--${slug(a.book || a.source || "unknown")}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    a.id = n > 1 ? `${base}-${n}` : base;
  }
  return adversaries;
}
