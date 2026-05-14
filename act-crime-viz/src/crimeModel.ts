import type { CrimePayload, MetricMode, OffenceTable } from "./types";

export function tableByDistrict(data: CrimePayload): Map<string, OffenceTable> {
  return new Map(data.offenceTables.map((t) => [t.district, t]));
}

export function allOffenceLabels(table: OffenceTable): string[] {
  return Object.keys(table.series)
    .filter((k) => k !== "Total")
    .sort();
}

export function familyMetricLabels(data: CrimePayload): string[] {
  return Object.keys(data.familyViolence.series);
}

function valueForOffence(
  table: OffenceTable,
  offence: string,
  period: string,
): number {
  const row = table.series[offence];
  if (!row) return 0;
  return row[period] ?? 0;
}

export function metricValue(
  table: OffenceTable | undefined,
  period: string,
  mode: MetricMode,
  violenceKeys: readonly string[],
): number {
  if (!table) return 0;
  if (mode.kind === "total") {
    return valueForOffence(table, "Total", period);
  }
  if (mode.kind === "violence_sum") {
    return violenceKeys.reduce(
      (acc, k) => acc + valueForOffence(table, k, period),
      0,
    );
  }
  if (mode.kind === "offence") {
    return valueForOffence(table, mode.offence, period);
  }
  return 0;
}

export function familyMetricValue(
  data: CrimePayload,
  metric: string,
  period: string,
): number {
  return data.familyViolence.series[metric]?.[period] ?? 0;
}

export function slicePeriods(
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
