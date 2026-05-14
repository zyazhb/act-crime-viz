import type { CrimePayload } from "./types";

function publicUrl(path: string): string {
  const rel = path.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

export async function loadCrimeData(): Promise<CrimePayload> {
  const r = await fetch(publicUrl("crime-data.json"), { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  const d = (await r.json()) as CrimePayload;
  let community = d.communityQuarterly ?? null;
  if (!community) {
    try {
      const cr = await fetch(publicUrl("community-data.json"), {
        cache: "no-store",
      });
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
