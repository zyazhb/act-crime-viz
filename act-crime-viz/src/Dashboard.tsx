import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { catalogKindPath } from "./catalogKindPath";
import {
  communityCategories,
  communityDistrictKeys,
  communitySuburbNames,
  communitySumValueAtPeriodIndex,
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
import { chip, ctl, h2, lbl, tableStyle, td, th } from "./dashboardStyles";
import { useI18n } from "./i18n/context";
import { loadCrimeData } from "./loadCrimeData";
import type { CrimePayload, DataSourceId, MetricMode } from "./types";

const DashboardTrendsChart = lazy(() => import("./DashboardTrendsChart"));
const DashboardCompareChart = lazy(() => import("./DashboardCompareChart"));

type TabId = "overview" | "trends" | "compare";

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
  const [offencePicks, setOffencePicks] = useState<string[]>([]);
  const [familyPick, setFamilyPick] = useState("");
  const [trafficPick, setTrafficPick] = useState("");
  const [comparePeriod, setComparePeriod] = useState("");
  const [commDistrict, setCommDistrict] = useState("");
  const [commCategories, setCommCategories] = useState<string[]>([]);
  const [commSuburbs, setCommSuburbs] = useState<string[]>([]);

  useEffect(() => {
    loadCrimeData()
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
        setOffencePicks(labels[0] ? [labels[0]] : []);
        setFamilyPick(familyMetricLabels(full)[0] ?? "");
        setTrafficPick(trafficMetricLabels(full)[0] ?? "");
        if (full.communityQuarterly?.districts?.length) {
          setCommDistrict(full.communityQuarterly.districts[0].district);
          setCommCategories([]);
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
    return { kind: "offence", offences: offencePicks };
  }, [dataSource, trafficPick, familyPick, offenceMetricKind, offencePicks]);

  const map = useMemo(() => (data ? tableByDistrict(data) : new Map()), [data]);

  const offenceOptions = useMemo(() => {
    const act = data?.offenceTables.find((x) => x.district === "ACT");
    return act ? allOffenceLabels(act) : [];
  }, [data]);

  useEffect(() => {
    if (dataSource !== "offences" || offenceMetricKind !== "offence") return;
    if (!offenceOptions.length) return;
    setOffencePicks((prev) => {
      const next = prev.filter((o) => offenceOptions.includes(o));
      return next.length > 0 ? next : [offenceOptions[0]];
    });
  }, [dataSource, offenceMetricKind, offenceOptions]);

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
    if (!cats[0]) return;
    setCommCategories((prev) => {
      const next = prev.filter((k) => cats.some((c) => c.category === k));
      if (next.length > 0) return next;
      return [cats[0].category];
    });
  }, [data, commDistrict]);

  useEffect(() => {
    if (!data?.communityQuarterly || !commDistrict || !commCategories.length)
      return;
    const cats = communityCategories(data.communityQuarterly, commDistrict);
    const union = new Set<string>();
    for (const k of commCategories) {
      const c = cats.find((x) => x.category === k);
      if (!c) continue;
      for (const n of communitySuburbNames(c).filter((x) => x !== "Total")) {
        union.add(n);
      }
    }
    const list = [...union].sort();
    setCommSuburbs((prev) => {
      const next = prev.filter((s) => list.includes(s));
      if (next.length > 0) return next;
      return list.slice(0, 6);
    });
  }, [data, commDistrict, commCategories]);

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

  const commSuburbNameOptions = useMemo(() => {
    if (!data?.communityQuarterly || !commDistrict || !commCategories.length)
      return [];
    const cats = communityCategories(data.communityQuarterly, commDistrict);
    const names = new Set<string>();
    for (const k of commCategories) {
      const c = cats.find((x) => x.category === k);
      if (!c) continue;
      for (const n of communitySuburbNames(c).filter((x) => x !== "Total")) {
        names.add(n);
      }
    }
    return [...names].sort();
  }, [data, commDistrict, commCategories]);

  const metricDescription = useMemo(() => {
    const sep = locale === "zh" ? "、" : ", ";
    if (dataSource === "community" && data?.communityQuarterly)
      return t("metricDesc.community", {
        district: tDistrict(commDistrict),
        categories:
          commCategories.length > 0
            ? commCategories.map((c) => tMetric(c)).join(sep)
            : "—",
      });
    if (metricMode.kind === "traffic")
      return t("metricDesc.traffic", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "family")
      return t("metricDesc.family", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "total") return t("metricDesc.total");
    if (metricMode.kind === "violence_sum") return t("metricDesc.violence");
    return t("metricDesc.offence", {
      names:
        metricMode.offences.length > 0
          ? metricMode.offences.map((o) => tMetric(o)).join(sep)
          : "—",
    });
  }, [
    data,
    dataSource,
    locale,
    commDistrict,
    commCategories,
    metricMode,
    t,
    tMetric,
    tDistrict,
  ]);

  const trendRows = useMemo(() => {
    if (!data) return [];
    if (dataSource === "community" && data.communityQuarterly) {
      const cq = data.communityQuarterly;
      const idxFor = (p: string) => cq.periodsChronological.indexOf(p);
      return periodsInRange.map((period) => {
        const ix = idxFor(period);
        const row: Record<string, string | number> = { period };
        for (const s of commSuburbs) {
          row[s] = communitySumValueAtPeriodIndex(
            cq,
            commDistrict,
            commCategories,
            s,
            ix,
          );
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
    commCategories,
    commSuburbs,
    selectedDistricts,
    map,
    metricMode,
  ]);

  const trendYDomain = useMemo((): [number, number] => {
    if (!trendRows.length) return [0, 1];
    let keys: string[] = [];
    if (dataSource === "community") keys = [...commSuburbs];
    else if (dataSource === "traffic" || dataSource === "familyViolence")
      keys = ["actWide"];
    else if (dataSource === "offences") keys = [...selectedDistricts];
    else return [0, 1];
    if (!keys.length) return [0, 1];
    let hi = Number.NEGATIVE_INFINITY;
    for (const row of trendRows) {
      for (const k of keys) {
        const v = Number(row[k]);
        if (Number.isFinite(v)) hi = Math.max(hi, v);
      }
    }
    if (!Number.isFinite(hi) || hi <= 0) return [0, 1];
    const pad = hi * 0.08 || 1;
    return [0, hi + pad];
  }, [trendRows, dataSource, commSuburbs, selectedDistricts]);

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
      const ix = cq.periodsChronological.indexOf(comparePeriod);
      return [...commSuburbs].sort().map((sub) => ({
        id: sub,
        label: sub,
        value: communitySumValueAtPeriodIndex(
          cq,
          commDistrict,
          commCategories,
          sub,
          ix,
        ),
      }));
    }
    return [];
  }, [
    data,
    comparePeriod,
    dataSource,
    tMetric,
    commDistrict,
    commCategories,
    commSuburbs,
  ]);

  const overviewRows = useMemo(() => {
    if (!data || !periodsInRange.length) return [];
    const latest = periodsInRange[periodsInRange.length - 1];
    if (dataSource === "community" && data.communityQuarterly) {
      const cq = data.communityQuarterly;
      const ix = cq.periodsChronological.indexOf(latest);
      return [...commSuburbs].sort().map((s) => ({
        id: s,
        label: s,
        value: communitySumValueAtPeriodIndex(
          cq,
          commDistrict,
          commCategories,
          s,
          ix,
        ),
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
    commCategories,
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

  const toggleCommCategory = (cat: string) => {
    setCommCategories((prev) => {
      if (prev.includes(cat)) {
        const next = prev.filter((x) => x !== cat);
        return next.length > 0 ? next : prev;
      }
      return [...prev, cat];
    });
  };

  const toggleOffencePick = (o: string) => {
    setOffencePicks((prev) => {
      if (prev.includes(o)) {
        const next = prev.filter((x) => x !== o);
        return next.length > 0 ? next : prev;
      }
      return [...prev, o];
    });
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
            <div style={{ gridColumn: "1 / -1" }}>
              <fieldset
                style={{
                  margin: 0,
                  padding: 0,
                  border: "none",
                }}
              >
                <legend style={{ ...lbl, padding: 0 }}>
                  {t("filter.offenceType")}
                </legend>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                    marginTop: 6,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {offenceOptions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleOffencePick(o)}
                      style={{
                        ...chip,
                        opacity: offencePicks.includes(o) ? 1 : 0.42,
                        borderColor: offencePicks.includes(o)
                          ? "#5b8def"
                          : "#2a3548",
                        background: offencePicks.includes(o)
                          ? "#1a2438"
                          : "#151b26",
                      }}
                    >
                      {tMetric(o)}
                    </button>
                  ))}
                </div>
              </fieldset>
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
              <div style={{ gridColumn: "1 / -1" }}>
                <fieldset
                  style={{
                    margin: 0,
                    padding: 0,
                    border: "none",
                  }}
                >
                  <legend style={{ ...lbl, padding: 0 }}>
                    {t("filter.commCategory")}
                  </legend>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      marginTop: 6,
                      maxHeight: 160,
                      overflowY: "auto",
                    }}
                  >
                    {commCategoryOptions.map((c) => (
                      <button
                        key={c.category}
                        type="button"
                        onClick={() => toggleCommCategory(c.category)}
                        style={{
                          ...chip,
                          opacity: commCategories.includes(c.category)
                            ? 1
                            : 0.42,
                          borderColor: commCategories.includes(c.category)
                            ? "#5b8def"
                            : "#2a3548",
                          background: commCategories.includes(c.category)
                            ? "#1a2438"
                            : "#151b26",
                        }}
                      >
                        {tMetric(c.category)}
                      </button>
                    ))}
                  </div>
                </fieldset>
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
                    {commSuburbNameOptions.map((s) => (
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

          {dataSource !== "community" && (
            <>
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
            </>
          )}

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
          <Suspense
            fallback={
              <div
                style={{
                  minHeight: 420,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7a94",
                  fontSize: "0.85rem",
                }}
              >
                {t("loading")}
              </div>
            }
          >
            <DashboardTrendsChart
              trendRows={trendRows}
              xInterval={xInterval}
              trendYDomain={trendYDomain}
              dataSource={dataSource}
              communityQuarterly={data.communityQuarterly}
              commDistrict={commDistrict}
              commSuburbs={commSuburbs}
              commCategories={commCategories}
              metricMode={metricMode}
              selectedDistricts={selectedDistricts}
              actWideKey={actWideKey}
              t={t}
              tMetric={tMetric}
              tDistrict={tDistrict}
            />
          </Suspense>
        )}

        {tab === "compare" && (
          <Suspense
            fallback={
              <div
                style={{
                  minHeight: 420,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7a94",
                  fontSize: "0.85rem",
                }}
              >
                {t("loading")}
              </div>
            }
          >
            <DashboardCompareChart
              compareChartTitle={compareChartTitle}
              isClusterBar={isClusterBar}
              clusterBarTall={clusterBarTall}
              compareBarRows={compareBarRows}
              compareDistrictRows={compareDistrictRows}
              comparePeriod={comparePeriod}
              dataSource={dataSource}
              t={t}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
