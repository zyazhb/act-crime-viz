export type OffenceSeries = Record<string, Record<string, number>>;

export type OffenceTable = {
  district: string;
  periods: string[];
  series: OffenceSeries;
};

export type CrimePayload = {
  sourceFile: string;
  offenceTables: OffenceTable[];
  periodsChronological: string[];
  traffic: { periods: string[]; series: OffenceSeries };
  familyViolence: { periods: string[]; series: OffenceSeries };
  violenceOffenceKeys: string[];
};

export type MetricMode =
  | { kind: "total" }
  | { kind: "violence_sum" }
  | { kind: "offence"; offence: string }
  | { kind: "family"; metric: string };
