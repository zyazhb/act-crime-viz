export type OffenceSeries = Record<string, Record<string, number>>;

export type OffenceTable = {
  district: string;
  periods: string[];
  series: OffenceSeries;
};

export type SheetMeta = {
  sheetId: string;
  sheetName: string;
  tableCount: number;
};

export type TableCatalogEntry = {
  tableNumber: number | null;
  sheetId: string;
  sheetName: string;
  title: string | null;
  kind: "offence" | "traffic" | "familyViolence";
  district: string | null;
  metricCount: number;
};

export type TrafficBlock = {
  tableNumber: number;
  title: string | null;
  periods: string[];
  series: OffenceSeries;
};

export type FamilyViolenceBlock = {
  tableNumber: number;
  title: string | null;
  periods: string[];
  series: OffenceSeries;
};

export type CrimePayload = {
  sourceFile: string;
  sheets: SheetMeta[];
  tablesCatalog: TableCatalogEntry[];
  offenceTables: OffenceTable[];
  periodsChronological: string[];
  traffic: TrafficBlock;
  familyViolence: FamilyViolenceBlock;
  violenceOffenceKeys: string[];
};

export type MetricMode =
  | { kind: "total" }
  | { kind: "violence_sum" }
  | { kind: "offence"; offence: string }
  | { kind: "family"; metric: string }
  | { kind: "traffic"; metric: string };

export type DataSourceId = "offences" | "traffic" | "familyViolence";
