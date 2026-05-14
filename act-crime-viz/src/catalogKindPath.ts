/** i18n key under `t(...)` for tables catalog `kind`. */
export function catalogKindPath(kind: string): string {
  if (kind === "offence") return "catalog.kindOffence";
  if (kind === "traffic") return "catalog.kindTraffic";
  return "catalog.kindFamily";
}
