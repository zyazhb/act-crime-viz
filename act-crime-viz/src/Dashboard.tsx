import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  communityCategories,
  communityDistrictKeys,
  communitySuburbNames,
  communityValueAtPeriodIndex,
  sliceCommunityPeriods,
} from "./communityModel";
import {
  allOffenceLabels,
  familyMetricLabels,
  familyMetricValue,
  metricValue,
  slicePeriods,
  tableByDistrict,
  trafficMetricLabels,
  trafficMetricValue,
} from "./crimeModel";
import { useI18n } from "./i18n/context";
import type { CrimePayload, DataSourceId, MetricMode } from "./types";

const PALETTE = [
  "#5b8def",
  "#34c7a0",
  "#e8a23c",
  "#e05d8c",
  "#9b7bed",
  "#5cc8ff",
  "#c4e05d",
  "#ff8a6a",
  "#6a9eff",
  "#d0d5de",
];

type TabId = "overview" | "trends" | "compare";

async function loadData(): Promise<CrimePayload> {
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

function catalogKindPath(kind: string): string {
  if (kind === "offence") return "catalog.kindOffence";
  if (kind === "traffic") return "catalog.kindTraffic";
  return "catalog.kindFamily";
}

export default function Dashboard() {
  const { locale, setLocale, t, tMetric, tDistrict } = useI18n();
  const [data, setData] = useState<CrimePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const [dataSource, setDataSource] = useState<DataSourceId>("offences");
  const districts = useMemo(() => {
    if (!data) return [];
    return data.offenceTables.map((x) => x.district);
  }, [data]);

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [offenceMetricKind, setOffenceMetricKind] = useState<
    "total" | "violence_sum" | "offence"
  >("violence_sum");
  const [offencePick, setOffencePick] = useState("");
  const [familyPick, setFamilyPick] = useState("");
  const [trafficPick, setTrafficPick] = useState("");
  const [comparePeriod, setComparePeriod] = useState("");
  const [commDistrict, setCommDistrict] = useState("");
  const [commCategory, setCommCategory] = useState("");
  const [commSuburbs, setCommSuburbs] = useState<string[]>([]);

  useEffect(() => {
    loadData()
      .then((d) => {
        const full: CrimePayload = {
          ...d,
          communityQuarterly: d.communityQuarterly ?? null,
        };
        setData(full);
        setSelectedDistricts(full.offenceTables.map((x) => x.district));
        const ch = full.periodsChronological;
        setPeriodFrom(ch[0] ?? "");
        setPeriodTo(ch[ch.length - 1] ?? "");
        const act = full.offenceTables.find((x) => x.district === "ACT");
        const labels = act ? allOffenceLabels(act) : [];
        setOffencePick(labels[0] ?? "");
        setFamilyPick(familyMetricLabels(full)[0] ?? "");
        setTrafficPick(trafficMetricLabels(full)[0] ?? "");
        if (full.communityQuarterly?.districts?.length) {
          setCommDistrict(full.communityQuarterly.districts[0].district);
          setCommCategory("");
          setCommSuburbs([]);
        }
      })
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  const metricMode: MetricMode = useMemo(() => {
    if (dataSource === "traffic")
      return { kind: "traffic", metric: trafficPick };
    if (dataSource === "familyViolence")
      return { kind: "family", metric: familyPick };
    if (offenceMetricKind === "total") return { kind: "total" };
    if (offenceMetricKind === "violence_sum") return { kind: "violence_sum" };
    return { kind: "offence", offence: offencePick };
  }, [dataSource, trafficPick, familyPick, offenceMetricKind, offencePick]);

  const map = useMemo(() => (data ? tableByDistrict(data) : new Map()), [data]);

  const offenceOptions = useMemo(() => {
    const act = data?.offenceTables.find((x) => x.district === "ACT");
    return act ? allOffenceLabels(act) : [];
  }, [data]);

  const familyOptions = useMemo(
    () => (data ? familyMetricLabels(data) : []),
    [data],
  );
  const trafficOptions = useMemo(
    () => (data ? trafficMetricLabels(data) : []),
    [data],
  );

  const periodsInRange = useMemo(() => {
    if (!data || !periodFrom || !periodTo) return [];
    if (dataSource === "community" && data.communityQuarterly) {
      return sliceCommunityPeriods(
        data.communityQuarterly.periodsChronological,
        periodFrom,
        periodTo,
      );
    }
    return slicePeriods(data.periodsChronological, periodFrom, periodTo);
  }, [data, dataSource, periodFrom, periodTo]);

  useEffect(() => {
    if (!periodsInRange.length) return;
    if (!comparePeriod || !periodsInRange.includes(comparePeriod)) {
      setComparePeriod(periodsInRange[periodsInRange.length - 1]);
    }
  }, [periodsInRange, comparePeriod]);

  useEffect(() => {
    if (!data) return;
    if (
      dataSource === "community" &&
      data.communityQuarterly?.periodsChronological.length
    ) {
      const q = data.communityQuarterly.periodsChronological;
      const q0 = q[0] ?? "";
      const q1 = q[q.length - 1] ?? "";
      setPeriodFrom((f) => (q.includes(f) ? f : q0));
      setPeriodTo((to) => (q.includes(to) ? to : q1));
    } else if (dataSource !== "community") {
      const m = data.periodsChronological;
      const m0 = m[0] ?? "";
      const m1 = m[m.length - 1] ?? "";
      setPeriodFrom((f) => (m.includes(f) ? f : m0));
      setPeriodTo((to) => (m.includes(to) ? to : m1));
    }
  }, [dataSource, data]);

  useEffect(() => {
    if (!data?.communityQuarterly || !commDistrict) return;
    const cats = communityCategories(data.communityQuarterly, commDistrict);
    const first = cats[0];
    if (!first) return;
    const valid = commCategory
      ? cats.find((c) => c.category === commCategory)
      : undefined;
    const cat = valid ?? first;
    if (cat.category !== commCategory) {
      setCommCategory(cat.category);
    }
    const names = communitySuburbNames(cat).filter((n) => n !== "Total");
    setCommSuburbs(names.slice(0, 6));
  }, [data, commDistrict, commCategory]);

  const periodOptions = useMemo(() => {
    if (!data) return [];
    if (dataSource === "community" && data.communityQuarterly)
      return data.communityQuarterly.periodsChronological;
    return data.periodsChronological;
  }, [data, dataSource]);

  const commDistrictOptions = useMemo(
    () =>
      data?.communityQuarterly
        ? communityDistrictKeys(data.communityQuarterly)
        : [],
    [data],
  );

  const commCategoryOptions = useMemo(
    () =>
      data?.communityQuarterly && commDistrict
        ? communityCategories(data.communityQuarterly, commDistrict)
        : [],
    [data, commDistrict],
  );

  const metricDescription = useMemo(() => {
    if (dataSource === "community" && data?.communityQuarterly)
      return t("metricDesc.community", {
        district: tDistrict(commDistrict),
        category: tMetric(commCategory),
      });
    if (metricMode.kind === "traffic")
      return t("metricDesc.traffic", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "family")
      return t("metricDesc.family", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "total") return t("metricDesc.total");
    if (metricMode.kind === "violence_sum") return t("metricDesc.violence");
    return t("metricDesc.offence", { name: tMetric(metricMode.offence) });
  }, [
    data,
    dataSource,
    commDistrict,
    commCategory,
    metricMode,
    t,
    tMetric,
    tDistrict,
  ]);

  const trendRows = useMemo(() => {
    if (!data) return [];
    if (dataSource === "community" && data.communityQuarterly) {
      const cq = data.communityQuarterly;
      const cat = communityCategories(cq, commDistrict).find(
        (c) => c.category === commCategory,
      );
      const idxFor = (p: string) => cq.periodsChronological.indexOf(p);
      return periodsInRange.map((period) => {
        const ix = idxFor(period);
        const row: Record<string, string | number> = { period };
        for (const s of commSuburbs) {
          row[s] = communityValueAtPeriodIndex(cat, s, ix);
        }
        return row;
      });
    }
    return periodsInRange.map((period) => {
      const row: Record<string, string | number> = { period };
      if (metricMode.kind === "traffic") {
        row.actWide = trafficMetricValue(data, metricMode.metric, period);
        return row;
      }
      if (metricMode.kind === "family") {
        row.actWide = familyMetricValue(data, metricMode.metric, period);
        return row;
      }
      for (const d of selectedDistricts) {
        const tbl = map.get(d);
        row[d] = metricValue(tbl, period, metricMode, data.violenceOffenceKeys);
      }
      return row;
    });
  }, [
    data,
    dataSource,
    periodsInRange,
    commDistrict,
    commCategory,
    commSuburbs,
    selectedDistricts,
    map,
    metricMode,
  ]);

  const compareDistrictRows = useMemo(() => {
    if (!data || !comparePeriod) return [];
    return selectedDistricts.map((d) => ({
      id: d,
      label: tDistrict(d),
      value: metricValue(
        map.get(d),
        comparePeriod,
        metricMode,
        data.violenceOffenceKeys,
      ),
    }));
  }, [data, comparePeriod, selectedDistricts, map, metricMode, tDistrict]);

  const compareBarRows = useMemo(() => {
    if (!data || !comparePeriod) return [];
    if (dataSource === "traffic") {
      return Object.keys(data.traffic.series)
        .sort()
        .map((k) => ({
          id: k,
          label: tMetric(k),
          value: data.traffic.series[k]?.[comparePeriod] ?? 0,
        }));
    }
    if (dataSource === "familyViolence") {
      return Object.keys(data.familyViolence.series)
        .sort()
        .map((k) => ({
          id: k,
          label: tMetric(k),
          value: data.familyViolence.series[k]?.[comparePeriod] ?? 0,
        }));
    }
    if (dataSource === "community" && data.communityQuarterly) {
      const cq = data.communityQuarterly;
      const cat = communityCategories(cq, commDistrict).find(
        (c) => c.category === commCategory,
      );
      const ix = cq.periodsChronological.indexOf(comparePeriod);
      return [...commSuburbs].sort().map((sub) => ({
        id: sub,
        label: sub,
        value: communityValueAtPeriodIndex(cat, sub, ix),
      }));
    }
    return [];
  }, [
    data,
    comparePeriod,
    dataSource,
    tMetric,
    commDistrict,
    commCategory,
    commSuburbs,
  ]);

  const overviewRows = useMemo(() => {
    if (!data || !periodsInRange.length) return [];
    const latest = periodsInRange[periodsInRange.length - 1];
    if (dataSource === "community" && data.communityQuarterly) {
      const cq = data.communityQuarterly;
      const cat = communityCategories(cq, commDistrict).find(
        (c) => c.category === commCategory,
      );
      const ix = cq.periodsChronological.indexOf(latest);
      return [...commSuburbs].sort().map((s) => ({
        id: s,
        label: s,
        value: communityValueAtPeriodIndex(cat, s, ix),
        period: latest,
      }));
    }
    if (dataSource === "traffic") {
      return Object.keys(data.traffic.series)
        .sort()
        .map((k) => ({
          id: k,
          label: tMetric(k),
          value: trafficMetricValue(data, k, latest),
          period: latest,
        }));
    }
    if (dataSource === "familyViolence") {
      return Object.keys(data.familyViolence.series)
        .sort()
        .map((k) => ({
          id: k,
          label: tMetric(k),
          value: familyMetricValue(data, k, latest),
          period: latest,
        }));
    }
    return selectedDistricts.map((d) => ({
      id: d,
      label: tDistrict(d),
      value: metricValue(
        map.get(d),
        latest,
        metricMode,
        data.violenceOffenceKeys,
      ),
      period: latest,
    }));
  }, [
    data,
    periodsInRange,
    selectedDistricts,
    map,
    metricMode,
    dataSource,
    tMetric,
    tDistrict,
    commDistrict,
    commCategory,
    commSuburbs,
  ]);

  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const selectPreset = (preset: "all" | "act" | "suburbs") => {
    if (!data) return;
    if (preset === "all") setSelectedDistricts(districts);
    else if (preset === "act") setSelectedDistricts(["ACT"]);
    else setSelectedDistricts(districts.filter((x) => x !== "ACT"));
  };

  const toggleCommSuburb = (s: string) => {
    setCommSuburbs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const xInterval = Math.max(0, Math.floor(periodsInRange.length / 12) - 1);
  const actWideKey = "actWide";

  if (err) {
    return (
      <div style={{ padding: "2rem", color: "#ffb4b4" }}>
        <h1>{t("errors.loadFailed", { status: err })}</h1>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2rem", color: "#8892a8" }}>
        <p>{t("loading")}</p>
      </div>
    );
  }

  const isClusterBar =
    tab === "compare" &&
    (dataSource === "traffic" ||
      dataSource === "familyViolence" ||
      dataSource === "community");
  const clusterBarTall = isClusterBar && dataSource === "community";
  const firstColLabel =
    dataSource === "offences"
      ? t("table.region")
      : dataSource === "community"
        ? t("table.suburb")
        : t("filter.metricKind");
  const compareChartTitle =
    dataSource === "offences"
      ? t("compare.districtTitle")
      : dataSource === "community"
        ? t("compare.suburbTitle")
        : t("compare.metricTitle");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 230,
          flexShrink: 0,
          background: "#111722",
          borderRight: "1px solid #1e2736",
          padding: "1.25rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <div
          style={{
            padding: "0 1.25rem 1rem",
            borderBottom: "1px solid #1e2736",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7a94",
              textTransform: "uppercase",
            }}
          >
            {t("brand.policing")}
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", marginTop: 4 }}>
            {t("brand.title")}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#5c6a82",
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
            {t("brand.source")}：{data.sourceFile}
          </div>
        </div>
        {(
          [
            ["overview", "nav.overview"],
            ["trends", "nav.trends"],
            ["compare", "nav.compare"],
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              margin: "0 0.75rem",
              padding: "0.65rem 1rem",
              textAlign: "left",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              background: tab === id ? "#1c2840" : "transparent",
              color: tab === id ? "#fff" : "#9aa8c2",
              fontWeight: tab === id ? 600 : 400,
            }}
          >
            {t(labelKey)}
          </button>
        ))}
        <div
          style={{
            marginTop: "auto",
            padding: "1rem 1.25rem 0",
            borderTop: "1px solid #1e2736",
            display: "flex",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              color: "#6b7a94",
              alignSelf: "center",
            }}
          >
            {locale === "zh" ? "语言" : "Language"}
          </span>
          {(["zh", "en"] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLocale(lng)}
              style={{
                ...chip,
                opacity: locale === lng ? 1 : 0.5,
                borderColor: locale === lng ? "#5b8def" : "#2a3548",
                background: locale === lng ? "#1a2438" : "#151b26",
              }}
              aria-pressed={locale === lng}
            >
              {lng === "zh" ? t("lang.zh") : t("lang.en")}
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: "0 0 0.35rem",
              fontSize: "1.5rem",
              fontWeight: 700,
            }}
          >
            {t("app.title")}
          </h1>
          <p style={{ margin: 0, color: "#8b9bb8", fontSize: "0.9rem" }}>
            {metricDescription}
          </p>
          {dataSource === "community" && data.communityQuarterly && (
            <p
              style={{
                margin: "0.5rem 0 0",
                color: "#5c6a82",
                fontSize: "0.78rem",
              }}
            >
              {data.communityQuarterly.sourceFile}
              {data.communityQuarterly.promisAsAt
                ? ` · ${data.communityQuarterly.promisAsAt}`
                : ""}
            </p>
          )}
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
            marginBottom: "1.75rem",
            padding: "1.25rem",
            background: "#111722",
            borderRadius: 12,
            border: "1px solid #1e2736",
          }}
        >
          <div>
            <label htmlFor="data-source" style={lbl}>
              {t("filter.dataSource")}
            </label>
            <select
              id="data-source"
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as DataSourceId)}
              style={ctl}
            >
              <option value="offences">{t("filter.sourceOffences")}</option>
              <option value="traffic">{t("filter.sourceTraffic")}</option>
              <option value="familyViolence">{t("filter.sourceFamily")}</option>
              {data.communityQuarterly && (
                <option value="community">{t("filter.sourceCommunity")}</option>
              )}
            </select>
          </div>

          {dataSource === "offences" && (
            <div>
              <label htmlFor="metric-kind" style={lbl}>
                {t("filter.metricKind")}
              </label>
              <select
                id="metric-kind"
                value={offenceMetricKind}
                onChange={(e) =>
                  setOffenceMetricKind(
                    e.target.value as typeof offenceMetricKind,
                  )
                }
                style={ctl}
              >
                <option value="total">{t("filter.metricTotal")}</option>
                <option value="violence_sum">
                  {t("filter.metricViolence")}
                </option>
                <option value="offence">{t("filter.metricOffence")}</option>
              </select>
            </div>
          )}

          {dataSource === "offences" && offenceMetricKind === "offence" && (
            <div>
              <label htmlFor="offence-pick" style={lbl}>
                {t("filter.offenceType")}
              </label>
              <select
                id="offence-pick"
                value={offencePick}
                onChange={(e) => setOffencePick(e.target.value)}
                style={ctl}
              >
                {offenceOptions.map((o) => (
                  <option key={o} value={o}>
                    {tMetric(o)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {dataSource === "traffic" && (
            <div>
              <label htmlFor="traffic-pick" style={lbl}>
                {t("filter.trafficMetric")}
              </label>
              <select
                id="traffic-pick"
                value={trafficPick}
                onChange={(e) => setTrafficPick(e.target.value)}
                style={ctl}
              >
                {trafficOptions.map((o) => (
                  <option key={o} value={o}>
                    {tMetric(o)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {dataSource === "familyViolence" && (
            <div>
              <label htmlFor="family-pick" style={lbl}>
                {t("filter.familyMetric")}
              </label>
              <select
                id="family-pick"
                value={familyPick}
                onChange={(e) => setFamilyPick(e.target.value)}
                style={ctl}
              >
                {familyOptions.map((o) => (
                  <option key={o} value={o}>
                    {tMetric(o)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {dataSource === "community" && data.communityQuarterly && (
            <>
              <div>
                <label htmlFor="comm-district" style={lbl}>
                  {t("filter.commPolicingDistrict")}
                </label>
                <select
                  id="comm-district"
                  value={commDistrict}
                  onChange={(e) => setCommDistrict(e.target.value)}
                  style={ctl}
                >
                  {commDistrictOptions.map((d) => (
                    <option key={d} value={d}>
                      {tDistrict(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="comm-cat" style={lbl}>
                  {t("filter.commCategory")}
                </label>
                <select
                  id="comm-cat"
                  value={commCategory}
                  onChange={(e) => setCommCategory(e.target.value)}
                  style={ctl}
                >
                  {commCategoryOptions.map((c) => (
                    <option key={c.category} value={c.category}>
                      {tMetric(c.category)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <fieldset
                  style={{
                    margin: 0,
                    padding: 0,
                    border: "none",
                  }}
                >
                  <legend style={{ ...lbl, padding: 0 }}>
                    {t("filter.commSuburbsLegend")}
                  </legend>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      marginTop: 6,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {communitySuburbNames(
                      commCategoryOptions.find(
                        (x) => x.category === commCategory,
                      ),
                    )
                      .filter((n) => n !== "Total")
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleCommSuburb(s)}
                          style={{
                            ...chip,
                            opacity: commSuburbs.includes(s) ? 1 : 0.42,
                            borderColor: commSuburbs.includes(s)
                              ? "#5b8def"
                              : "#2a3548",
                            background: commSuburbs.includes(s)
                              ? "#1a2438"
                              : "#151b26",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                  </div>
                </fieldset>
              </div>
            </>
          )}

          <div>
            <label htmlFor="period-from" style={lbl}>
              {t("filter.periodFrom")}
            </label>
            <select
              id="period-from"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              style={ctl}
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="period-to" style={lbl}>
              {t("filter.periodTo")}
            </label>
            <select
              id="period-to"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              style={ctl}
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {dataSource === "offences" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <fieldset
                style={{
                  margin: 0,
                  padding: 0,
                  border: "none",
                }}
              >
                <legend style={{ ...lbl, padding: 0 }}>
                  {t("filter.districts")}
                </legend>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                    marginTop: 6,
                  }}
                >
                  <button
                    type="button"
                    style={chip}
                    onClick={() => selectPreset("all")}
                  >
                    {t("district.presets.all")}
                  </button>
                  <button
                    type="button"
                    style={chip}
                    onClick={() => selectPreset("act")}
                  >
                    {t("district.presets.act")}
                  </button>
                  <button
                    type="button"
                    style={chip}
                    onClick={() => selectPreset("suburbs")}
                  >
                    {t("district.presets.suburbs")}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {districts.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDistrict(d)}
                      style={{
                        ...chip,
                        opacity: selectedDistricts.includes(d) ? 1 : 0.45,
                        borderColor: selectedDistricts.includes(d)
                          ? "#5b8def"
                          : "#2a3548",
                        background: selectedDistricts.includes(d)
                          ? "#1a2438"
                          : "#151b26",
                      }}
                    >
                      {tDistrict(d)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {dataSource === "familyViolence" && (
            <p
              style={{
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: "0.85rem",
                color: "#7a8aa3",
              }}
            >
              {t("family.note")}
            </p>
          )}
          {dataSource === "traffic" && (
            <p
              style={{
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: "0.85rem",
                color: "#7a8aa3",
              }}
            >
              {t("traffic.note")}
            </p>
          )}
          {dataSource === "community" && (
            <p
              style={{
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: "0.85rem",
                color: "#7a8aa3",
              }}
            >
              {t("community.note")}
            </p>
          )}

          {tab === "compare" && (
            <div>
              <label htmlFor="compare-period" style={lbl}>
                {t("filter.compareMonth")}
              </label>
              <select
                id="compare-period"
                value={comparePeriod}
                onChange={(e) => setComparePeriod(e.target.value)}
                style={ctl}
              >
                {periodsInRange.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {tab === "overview" && (
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={h2}>{t("overview.snapshotTitle")}</h2>
            <div
              style={{
                overflowX: "auto",
                borderRadius: 12,
                border: "1px solid #1e2736",
              }}
            >
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={th}>{firstColLabel}</th>
                    <th style={th}>{t("table.period")}</th>
                    <th style={{ ...th, textAlign: "right" }}>
                      {t("table.value")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map((r) => (
                    <tr key={r.id}>
                      <td style={td}>{r.label}</td>
                      <td style={{ ...td, color: "#7a8aa3" }}>{r.period}</td>
                      <td
                        style={{ ...td, textAlign: "right", fontWeight: 600 }}
                      >
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ ...h2, marginTop: "2rem" }}>
              {t("overview.catalogTitle")}
            </h2>
            <div
              style={{
                overflowX: "auto",
                borderRadius: 12,
                border: "1px solid #1e2736",
              }}
            >
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={th}>{t("table.tableNo")}</th>
                    <th style={th}>{t("table.sheet")}</th>
                    <th style={th}>{t("table.kind")}</th>
                    <th style={th}>{t("table.region")}</th>
                    <th style={{ ...th, textAlign: "right" }}>
                      {t("table.metrics")}
                    </th>
                    <th style={th}>{t("table.title")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tablesCatalog.map((row) => (
                    <tr
                      key={`${row.tableNumber}-${row.sheetId}-${row.district}`}
                    >
                      <td style={td}>{row.tableNumber ?? "—"}</td>
                      <td style={td}>{row.sheetName}</td>
                      <td style={td}>{t(catalogKindPath(row.kind))}</td>
                      <td style={td}>
                        {row.district ? tDistrict(row.district) : "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        {row.metricCount}
                      </td>
                      <td
                        style={{ ...td, color: "#7a8aa3", fontSize: "0.82rem" }}
                      >
                        {row.title ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "trends" && (
          <section>
            <h2 style={h2}>{t("nav.trends")}</h2>
            <div style={{ height: 420, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendRows}
                  margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#7a8aa3", fontSize: 11 }}
                    interval={xInterval}
                  />
                  <YAxis tick={{ fill: "#7a8aa3", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#151b26",
                      border: "1px solid #2a3548",
                    }}
                    labelStyle={{ color: "#c5d0e6" }}
                  />
                  <Legend />
                  {dataSource === "community" ? (
                    commSuburbs.map((s, i) => (
                      <Line
                        key={s}
                        type="monotone"
                        dataKey={s}
                        name={s}
                        stroke={PALETTE[i % PALETTE.length]}
                        dot={false}
                        strokeWidth={2}
                      />
                    ))
                  ) : metricMode.kind === "traffic" ||
                    metricMode.kind === "family" ? (
                    <Line
                      type="monotone"
                      dataKey={actWideKey}
                      name={t("district.actWide")}
                      stroke={PALETTE[0]}
                      dot={false}
                      strokeWidth={2}
                    />
                  ) : (
                    selectedDistricts.map((d, i) => (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={d}
                        name={tDistrict(d)}
                        stroke={PALETTE[i % PALETTE.length]}
                        dot={false}
                        strokeWidth={2}
                      />
                    ))
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {tab === "compare" && (
          <section>
            <h2 style={h2}>{compareChartTitle}</h2>
            <div style={{ height: 420, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={isClusterBar ? compareBarRows : compareDistrictRows}
                  margin={{
                    top: 8,
                    right: 16,
                    left: 8,
                    bottom: clusterBarTall ? 140 : isClusterBar ? 120 : 64,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#7a8aa3", fontSize: 10 }}
                    angle={clusterBarTall ? -40 : isClusterBar ? -35 : -28}
                    textAnchor="end"
                    height={clusterBarTall ? 150 : isClusterBar ? 130 : 70}
                  />
                  <YAxis tick={{ fill: "#7a8aa3", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#151b26",
                      border: "1px solid #2a3548",
                    }}
                    labelStyle={{ color: "#c5d0e6" }}
                  />
                  <Bar
                    dataKey="value"
                    name={comparePeriod}
                    fill="#5b8def"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {dataSource === "familyViolence" && (
              <p style={{ color: "#7a8aa3", fontSize: "0.85rem" }}>
                {t("family.compareNote")}
              </p>
            )}
            {dataSource === "traffic" && (
              <p style={{ color: "#7a8aa3", fontSize: "0.85rem" }}>
                {t("traffic.compareNote")}
              </p>
            )}
            {dataSource === "community" && (
              <p style={{ color: "#7a8aa3", fontSize: "0.85rem" }}>
                {t("community.compareNote")}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

const lbl: CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: "#6b7a94",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const ctl: CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid #2a3548",
  background: "#0c1018",
  color: "#e8ecf4",
};

const chip: CSSProperties = {
  fontSize: "0.78rem",
  padding: "0.35rem 0.65rem",
  borderRadius: 999,
  border: "1px solid #2a3548",
  background: "#151b26",
  color: "#c5d0e6",
  cursor: "pointer",
};

const h2: CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 600,
  margin: "0 0 1rem",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
  background: "#111722",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "0.65rem 1rem",
  borderBottom: "1px solid #1e2736",
  color: "#9aa8c2",
  fontWeight: 600,
  fontSize: "0.78rem",
  textTransform: "uppercase",
};

const td: CSSProperties = {
  padding: "0.55rem 1rem",
  borderBottom: "1px solid #1a2230",
};
