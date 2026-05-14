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
} from "./crimeModel";
import type { CrimePayload, MetricMode } from "./types";

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
    if (!r.ok) throw new Error(`加载数据失败: ${r.status}`);
    return r.json() as Promise<CrimePayload>;
  });
}

function metricDescription(mode: MetricMode): string {
  if (mode.kind === "total") return "全部罪行合计（含财产、交通罚单等）";
  if (mode.kind === "violence_sum")
    return "暴力相关罪行汇总：袭击、凶杀、性侵犯、抢劫及针对人身罪行";
  if (mode.kind === "offence") return `单项：${mode.offence}`;
  return `家庭暴力（全 ACT）：${mode.metric}`;
}

export default function App() {
  const [data, setData] = useState<CrimePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const districts = useMemo(() => {
    if (!data) return [];
    return data.offenceTables.map((t) => t.district);
  }, [data]);

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [metricKind, setMetricKind] = useState<
    "total" | "violence_sum" | "offence" | "family"
  >("violence_sum");
  const [offencePick, setOffencePick] = useState("");
  const [familyPick, setFamilyPick] = useState("");
  const [comparePeriod, setComparePeriod] = useState("");

  useEffect(() => {
    loadData()
      .then((d) => {
        setData(d);
        const all = d.offenceTables.map((t) => t.district);
        setSelectedDistricts(all);
        const ch = d.periodsChronological;
        setPeriodFrom(ch[0] ?? "");
        setPeriodTo(ch[ch.length - 1] ?? "");
        const act = d.offenceTables.find((t) => t.district === "ACT");
        const labels = act ? allOffenceLabels(act) : [];
        setOffencePick(labels[0] ?? "");
        const fm = familyMetricLabels(d);
        setFamilyPick(fm[0] ?? "");
      })
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  const periodsInRange = useMemo(() => {
    if (!data || !periodFrom || !periodTo) return [];
    return slicePeriods(data.periodsChronological, periodFrom, periodTo);
  }, [data, periodFrom, periodTo]);

  const metricMode: MetricMode = useMemo(() => {
    if (metricKind === "total") return { kind: "total" };
    if (metricKind === "violence_sum") return { kind: "violence_sum" };
    if (metricKind === "offence")
      return { kind: "offence", offence: offencePick };
    return { kind: "family", metric: familyPick };
  }, [metricKind, offencePick, familyPick]);

  const map = useMemo(() => (data ? tableByDistrict(data) : new Map()), [data]);

  const offenceOptions = useMemo(() => {
    const act = data?.offenceTables.find((t) => t.district === "ACT");
    return act ? allOffenceLabels(act) : [];
  }, [data]);

  const familyOptions = useMemo(
    () => (data ? familyMetricLabels(data) : []),
    [data],
  );

  useEffect(() => {
    if (!periodsInRange.length) return;
    if (!comparePeriod || !periodsInRange.includes(comparePeriod)) {
      setComparePeriod(periodsInRange[periodsInRange.length - 1]);
    }
  }, [periodsInRange, comparePeriod]);

  const trendRows = useMemo(() => {
    if (!data) return [];
    return periodsInRange.map((period) => {
      const row: Record<string, string | number> = { period };
      if (metricMode.kind === "family") {
        row.ACT = familyMetricValue(data, metricMode.metric, period);
        return row;
      }
      for (const d of selectedDistricts) {
        const t = map.get(d);
        row[d] = metricValue(t, period, metricMode, data.violenceOffenceKeys);
      }
      return row;
    });
  }, [data, periodsInRange, selectedDistricts, map, metricMode]);

  const compareRows = useMemo(() => {
    if (!data || !comparePeriod) return [];
    if (metricMode.kind === "family") {
      return [
        {
          district: "ACT（全境）",
          value: familyMetricValue(data, metricMode.metric, comparePeriod),
        },
      ];
    }
    return selectedDistricts.map((d) => ({
      district: d,
      value: metricValue(
        map.get(d),
        comparePeriod,
        metricMode,
        data.violenceOffenceKeys,
      ),
    }));
  }, [data, comparePeriod, selectedDistricts, map, metricMode]);

  const overviewRows = useMemo(() => {
    if (!data || !periodsInRange.length) return [];
    const latest = periodsInRange[periodsInRange.length - 1];
    if (metricMode.kind === "family") {
      return [
        {
          district: "ACT",
          value: familyMetricValue(data, metricMode.metric, latest),
          period: latest,
        },
      ];
    }
    return selectedDistricts.map((d) => ({
      district: d,
      value: metricValue(
        map.get(d),
        latest,
        metricMode,
        data.violenceOffenceKeys,
      ),
      period: latest,
    }));
  }, [data, periodsInRange, selectedDistricts, map, metricMode]);

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

  if (err) {
    return (
      <div style={{ padding: "2rem", color: "#ffb4b4" }}>
        <h1>无法加载</h1>
        <p>{err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2rem", color: "#8892a8" }}>
        <p>正在加载犯罪统计数据…</p>
      </div>
    );
  }

  const ch = data.periodsChronological;
  const xInterval = Math.max(0, Math.floor(periodsInRange.length / 12) - 1);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
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
            ACT Policing
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", marginTop: 4 }}>
            犯罪统计
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#5c6a82",
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
            来源：{data.sourceFile}
          </div>
        </div>
        {(
          [
            ["overview", "数据概览"],
            ["trends", "历史趋势"],
            ["compare", "分区对比"],
          ] as const
        ).map(([id, label]) => (
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
            {label}
          </button>
        ))}
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
            澳大利亚首都领地（ACT）犯罪情况
          </h1>
          <p style={{ margin: 0, color: "#8b9bb8", fontSize: "0.9rem" }}>
            {metricDescription(metricMode)}
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
            <label htmlFor="metric-kind" style={lbl}>
              指标类型
            </label>
            <select
              id="metric-kind"
              value={metricKind}
              onChange={(e) =>
                setMetricKind(e.target.value as typeof metricKind)
              }
              style={ctl}
            >
              <option value="total">全部合计</option>
              <option value="violence_sum">暴力罪行汇总</option>
              <option value="offence">单项罪行</option>
              <option value="family">家庭暴力（ACT）</option>
            </select>
          </div>
          {metricKind === "offence" && (
            <div>
              <label htmlFor="offence-pick" style={lbl}>
                罪行类别
              </label>
              <select
                id="offence-pick"
                value={offencePick}
                onChange={(e) => setOffencePick(e.target.value)}
                style={ctl}
              >
                {offenceOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
          {metricKind === "family" && (
            <div>
              <label htmlFor="family-pick" style={lbl}>
                家庭暴力指标
              </label>
              <select
                id="family-pick"
                value={familyPick}
                onChange={(e) => setFamilyPick(e.target.value)}
                style={ctl}
              >
                {familyOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="period-from" style={lbl}>
              时间范围（起）
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
              时间范围（止）
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
          {metricMode.kind !== "family" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <fieldset
                style={{
                  margin: 0,
                  padding: 0,
                  border: "none",
                }}
              >
                <legend style={{ ...lbl, padding: 0 }}>分区（多选）</legend>
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
                    全选
                  </button>
                  <button
                    type="button"
                    style={chip}
                    onClick={() => selectPreset("act")}
                  >
                    仅 ACT
                  </button>
                  <button
                    type="button"
                    style={chip}
                    onClick={() => selectPreset("suburbs")}
                  >
                    仅辖区
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
                      {d}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {metricMode.kind === "family" && (
            <p
              style={{
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: "0.85rem",
                color: "#7a8aa3",
              }}
            >
              家庭暴力数据为全 ACT 口径，与辖区表格无关。
            </p>
          )}
          {tab === "compare" && (
            <div>
              <label htmlFor="compare-period" style={lbl}>
                对比月份
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
          <section>
            <h2 style={h2}>当前区间末尾月快照</h2>
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
                    <th style={th}>分区</th>
                    <th style={th}>报告月</th>
                    <th style={{ ...th, textAlign: "right" }}>数值</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map((r) => (
                    <tr key={r.district}>
                      <td style={td}>{r.district}</td>
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
          </section>
        )}

        {tab === "trends" && (
          <section>
            <h2 style={h2}>历史趋势</h2>
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
                  {metricMode.kind === "family" ? (
                    <Line
                      type="monotone"
                      dataKey="ACT"
                      name="ACT"
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
                        name={d}
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
            <h2 style={h2}>分区对比（选定月份）</h2>
            <div style={{ height: 400, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={compareRows}
                  margin={{ top: 8, right: 16, left: 8, bottom: 64 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2736" />
                  <XAxis
                    dataKey="district"
                    tick={{ fill: "#7a8aa3", fontSize: 11 }}
                    angle={-28}
                    textAnchor="end"
                    height={70}
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
            {metricMode.kind === "family" && (
              <p style={{ color: "#7a8aa3", fontSize: "0.85rem" }}>
                家庭暴力仅展示全 ACT 一项。
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
