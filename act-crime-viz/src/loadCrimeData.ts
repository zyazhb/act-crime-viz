import type { CrimePayload } from "./types";

export async function loadCrimeData(): Promise<CrimePayload> {
  const r = await fetch("/crime-data.json", { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  const d = (await r.json()) as CrimePayload;
  let community = d.communityQuarterly ?? null;
  if (!community) {
    try {
      const cr = await fetch("/community-data.json", { cache: "no-store" });
      if (cr.ok) {
        const extra = (await cr.json()) as {
          communityQuarterly?: CrimePayload["communityQuarterly"];
        };
        if (extra.communityQuarterly) community = extra.communityQuarterly;
      }
    } catch {
      /* optional sidecar */
    }
  }
  return { ...d, communityQuarterly: community };
}
