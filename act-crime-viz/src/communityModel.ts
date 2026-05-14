import type { CommunityCategory, CommunityQuarterly } from "./types";

export function communityDistrictKeys(cq: CommunityQuarterly | null): string[] {
  if (!cq) return [];
  return cq.districts.map((d) => d.district);
}

export function communityCategories(
  cq: CommunityQuarterly | null,
  district: string,
): CommunityCategory[] {
  if (!cq) return [];
  const d = cq.districts.find((x) => x.district === district);
  return d?.categories ?? [];
}

export function sliceCommunityPeriods(
  chronological: readonly string[],
  fromLabel: string,
  toLabel: string,
): string[] {
  const i0 = chronological.indexOf(fromLabel);
  const i1 = chronological.indexOf(toLabel);
  if (i0 < 0 || i1 < 0) return [...chronological];
  const [a, b] = i0 <= i1 ? [i0, i1] : [i1, i0];
  return chronological.slice(a, b + 1);
}

export function communitySuburbNames(
  cat: CommunityCategory | undefined,
): string[] {
  if (!cat) return [];
  return cat.suburbs.map((s) => s.name);
}

export function communityValueAtPeriodIndex(
  cat: CommunityCategory | undefined,
  suburb: string,
  periodIndex: number,
): number {
  if (!cat || periodIndex < 0) return 0;
  const row = cat.suburbs.find((s) => s.name === suburb);
  if (!row) return 0;
  const q = row.q;
  return periodIndex < q.length ? q[periodIndex] : 0;
}
