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

function loadData(): Promise<CrimePayload> {
  return fetch("/crime-data.json").then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<CrimePayload>;
  });
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

  useEffect(() => {
    loadData()
      .then((d) => {
        setData(d);
        setSelectedDistricts(d.offenceTables.map((x) => x.district));
        const ch = d.periodsChronological;
        setPeriodFrom(ch[0] ?? "");
        setPeriodTo(ch[ch.length - 1] ?? "");
        const act = d.offenceTables.find((x) => x.district === "ACT");
        const labels = act ? allOffenceLabels(act) : [];
        setOffencePick(labels[0] ?? "");
        setFamilyPick(familyMetricLabels(d)[0] ?? "");
        setTrafficPick(trafficMetricLabels(d)[0] ?? "");
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
    return slicePeriods(data.periodsChronological, periodFrom, periodTo);
  }, [data, periodFrom, periodTo]);

  useEffect(() => {
    if (!periodsInRange.length) return;
    if (!comparePeriod || !periodsInRange.includes(comparePeriod)) {
      setComparePeriod(periodsInRange[periodsInRange.length - 1]);
    }
  }, [periodsInRange, comparePeriod]);

  const metricDescription = useMemo(() => {
    if (metricMode.kind === "traffic")
      return t("metricDesc.traffic", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "family")
      return t("metricDesc.family", { name: tMetric(metricMode.metric) });
    if (metricMode.kind === "total") return t("metricDesc.total");
    if (metricMode.kind === "violence_sum") return t("metricDesc.violence");
    return t("metricDesc.offence", { name: tMetric(metricMode.offence) });
  }, [metricMode, t, tMetric]);

  const trendRows = useMemo(() => {
    if (!data) return [];
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
  }, [data, periodsInRange, selectedDistricts, map, metricMode]);

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

  const compareMetricRows = useMemo(() => {
    if (!data || !comparePeriod) return [];
    const series =
      dataSource === "traffic"
        ? data.traffic.series
        : data.familyViolence.series;
    return Object.keys(series)
      .sort()
      .map((k) => ({
        id: k,
        label: tMetric(k),
        value: series[k]?.[comparePeriod] ?? 0,
      }));
  }, [data, comparePeriod, dataSource, tMetric]);

  const overviewRows = useMemo(() => {
    if (!data || !periodsInRange.length) return [];
    const latest = periodsInRange[periodsInRange.length - 1];
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

  const ch = data.periodsChronological;
  const isMetricCompare =
    tab === "compare" &&
    (dataSource === "traffic" || dataSource === "familyViolence");
  const firstColLabel =
    dataSource === "offences" ? t("table.region") : t("filter.metricKind");

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
              {ch.map((p) => (
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
              {ch.map((p) => (
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
                  {metricMode.kind === "traffic" ||
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
            <h2 style={h2}>
              {isMetricCompare
                ? t("compare.metricTitle")
                : t("compare.districtTitle")}
            </h2>
            <div style={{ height: 420, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    isMetricCompare ? compareMetricRows : compareDistrictRows
                  }
                  margin={{
                    top: 8,
                    right: 16,
                    left: 8,
                    bottom: isMetricCompare ? 120 : 64,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#7a8aa3", fontSize: 10 }}
                    angle={isMetricCompare ? -35 : -28}
                    textAnchor="end"
                    height={isMetricCompare ? 130 : 70}
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
