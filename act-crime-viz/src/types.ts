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

export type CommunitySuburbRow = {
  name: string;
  q: number[];
};

export type CommunityCategory = {
  category: string;
  suburbs: CommunitySuburbRow[];
};

export type CommunityDistrict = {
  district: string;
  sourceSheet: string;
  categories: CommunityCategory[];
};

export type CommunityQuarterly = {
  sourceFile: string;
  granularity: "quarter";
  promisAsAt: string | null;
  periodsChronological: string[];
  districts: CommunityDistrict[];
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
  communityQuarterly?: CommunityQuarterly | null;
};

export type MetricMode =
  | { kind: "total" }
  | { kind: "violence_sum" }
  | { kind: "offence"; offences: string[] }
  | { kind: "family"; metric: string }
  | { kind: "traffic"; metric: string };

export type DataSourceId =
  | "offences"
  | "traffic"
  | "familyViolence"
  | "community";
