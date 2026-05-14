import type { Coordinate, TooltipIndex, TooltipPayload } from "recharts";
import * as Recharts from "recharts";
import { communityCategoryBreakdownForSuburbAtPeriodIndex } from "./communityModel";
import { colorForSeriesKey } from "./seriesColor";
import type { CommunityQuarterly, DataSourceId } from "./types";

const { Cell, Pie, PieChart } = Recharts;

type RechartsPlotHooks = {
  usePlotArea: () =>
    | { x: number; y: number; width: number; height: number }
    | undefined;
  useYAxisDomain: (yAxisId?: string | number) => unknown;
};

const RechartsHooks = Recharts as typeof Recharts & RechartsPlotHooks;

function payloadSeriesKey(p: TooltipPayload[number]): string {
  const dk = p.dataKey;
  if (typeof dk === "function") return String(p.name ?? "");
  return String(dk ?? p.name ?? "");
}

/** Tooltip pie: fixed pixel size — avoid ResponsiveContainer inside Tooltip (mis-measures → offset). */
const TRENDS_PIE_W = 112;
const TRENDS_PIE_H = 112;
const TRENDS_PIE_CX = TRENDS_PIE_W / 2;
const TRENDS_PIE_CY = TRENDS_PIE_H / 2;
const TRENDS_PIE_OUTER = 48;
const TRENDS_PIE_INNER = 26;

/** Pick series whose value is nearest to Y-axis value inferred from cursor Y inside the plot box. */
function pickHoveredSeriesKey(
  payload: TooltipPayload | undefined,
  chartY: number | undefined,
  plot: { x?: number; y?: number; width?: number; height?: number } | undefined,
  yDomain: readonly [number, number],
  allowKeys?: ReadonlySet<string> | null,
): string | null {
  if (!payload?.length) return null;
  const list = allowKeys
    ? payload.filter((p) => allowKeys.has(payloadSeriesKey(p)))
    : [...payload];
  const usable = list.filter((p) => {
    const v = typeof p.value === "number" ? p.value : Number(p.value);
    return Number.isFinite(v);
  });
  if (!usable.length) return null;

  let dataY: number | null = null;
  if (
    chartY != null &&
    Number.isFinite(chartY) &&
    plot?.height != null &&
    plot.height > 0
  ) {
    const top = plot.y ?? 0;
    const t = (chartY - top) / plot.height;
    const nv = Math.min(1, Math.max(0, 1 - t));
    const [d0, d1] = yDomain;
    dataY = d0 + nv * (d1 - d0);
  }

  if (dataY != null && Number.isFinite(dataY)) {
    let best: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of usable) {
      const v = Number(p.value);
      const k = payloadSeriesKey(p);
      const d = Math.abs(v - dataY);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best) return best;
  }
  let maxK: string | null = null;
  let maxV = -Number.POSITIVE_INFINITY;
  for (const p of usable) {
    const v = Number(p.value);
    const k = payloadSeriesKey(p);
    if (v > maxV) {
      maxV = v;
      maxK = k;
    }
  }
  return maxK;
}

export type CommunityPieCtx = {
  cq: CommunityQuarterly;
  district: string;
  selectedSuburbs: readonly string[];
  categoryKeys: readonly string[];
};

export type TrendsLineTooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload;
  coordinate?: Coordinate;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  accessibilityLayer?: boolean;
  activeIndex?: TooltipIndex;
  t: (path: string, vars?: Record<string, string> | undefined) => string;
  tMetric: (key: string) => string;
  dataSource: DataSourceId;
  communityPie?: CommunityPieCtx;
  trendYDomain: readonly [number, number];
};

function rowDisplayName(entry: TooltipPayload[number]): string {
  if (entry.name != null && String(entry.name) !== "")
    return String(entry.name);
  const dk = entry.dataKey;
  if (typeof dk === "function") return "—";
  return String(dk ?? "—");
}

function TrendsLineTooltipContent({
  active,
  label,
  payload,
  coordinate,
  viewBox,
  t,
  tMetric,
  dataSource,
  communityPie,
  trendYDomain,
}: TrendsLineTooltipContentProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.map((e) => {
    const raw = e.value;
    const v =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : Number.NaN;
    return {
      name: rowDisplayName(e),
      value: Number.isFinite(v) ? v : 0,
      color: String(e.color ?? e.stroke ?? "#5b8def"),
    };
  });

  const periodLabel = label == null || label === "" ? null : String(label);

  let pieData: { id: string; name: string; value: number; color: string }[] =
    [];
  let pieTitleKey: "trends.composition" | "trends.compositionCategories" =
    "trends.composition";

  if (
    dataSource === "community" &&
    communityPie &&
    periodLabel &&
    communityPie.categoryKeys.length > 0
  ) {
    pieTitleKey = "trends.compositionCategories";
    const allow = new Set(communityPie.selectedSuburbs);
    const hoveredSuburb = pickHoveredSeriesKey(
      payload,
      coordinate?.y,
      viewBox,
      trendYDomain,
      allow,
    );
    const ix = communityPie.cq.periodsChronological.indexOf(periodLabel);
    if (
      ix >= 0 &&
      hoveredSuburb &&
      communityPie.selectedSuburbs.includes(hoveredSuburb)
    ) {
      const raw = communityCategoryBreakdownForSuburbAtPeriodIndex(
        communityPie.cq,
        communityPie.district,
        hoveredSuburb,
        communityPie.categoryKeys,
        ix,
      );
      const sorted = raw
        .filter((r) => r.value > 0)
        .sort((a, b) => a.category.localeCompare(b.category));
      pieData = sorted.map((r) => ({
        id: r.category,
        name: tMetric(r.category),
        value: r.value,
        color: colorForSeriesKey(r.category),
      }));
    }
  } else {
    const positive = rows.filter((r) => r.value > 0);
    pieData = positive.map((r, i) => ({
      id: `${r.name}-${i}`,
      name: r.name,
      value: r.value,
      color: r.color,
    }));
  }

  const total = pieData.reduce((a, r) => a + r.value, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        background: "#151b26",
        border: "1px solid #2a3548",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 156,
          minWidth: 140,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#8b9bb8",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {t(pieTitleKey)}
        </div>
        {total > 0 ? (
          <div
            style={{
              width: TRENDS_PIE_W,
              height: TRENDS_PIE_H,
              lineHeight: 0,
            }}
          >
            <PieChart
              width={TRENDS_PIE_W}
              height={TRENDS_PIE_H}
              style={{ display: "block" }}
            >
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx={TRENDS_PIE_CX}
                cy={TRENDS_PIE_CY}
                innerRadius={TRENDS_PIE_INNER}
                outerRadius={TRENDS_PIE_OUTER}
                paddingAngle={1}
                stroke="#0d1117"
                strokeWidth={1}
                isAnimationActive={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
        ) : (
          <div
            style={{
              width: TRENDS_PIE_W,
              height: TRENDS_PIE_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#7a8aa3",
              textAlign: "center",
              padding: "0 4px",
            }}
          >
            {t("trends.noPositive")}
          </div>
        )}
        {total > 0 && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                color: "#6b7a94",
                marginBottom: 6,
              }}
            >
              {t("trends.pieLegend")}
            </div>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: 140,
                overflowY: "auto",
              }}
            >
              {pieData.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 11,
                    marginBottom: 5,
                    color: "#d4dce8",
                    lineHeight: 1.35,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: entry.color,
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {entry.name}
                    <span
                      style={{
                        color: "#6b7a94",
                        fontVariantNumeric: "tabular-nums",
                        marginLeft: 6,
                      }}
                    >
                      {Math.round((100 * entry.value) / total)}% ·{" "}
                      {entry.value.toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: "#c5d0e6",
            fontWeight: 600,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          {periodLabel ?? "—"}
        </div>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {rows.map((r) => (
            <li
              key={r.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                marginBottom: 4,
                color: "#d4dce8",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: r.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>{r.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {r.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function parseFinitePair(d: unknown): readonly [number, number] | null {
  if (!Array.isArray(d) || d.length < 2) return null;
  const a = Number(d[0]);
  const b = Number(d[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

/**
 * Recharts v3 no longer passes `viewBox` into custom Tooltip content; without it,
 * Y→value mapping in pickHoveredSeriesKey fails and the pie always falls back to the max series.
 */
export function TrendsLineTooltipWithLayout(
  props: TrendsLineTooltipContentProps,
) {
  const plot = RechartsHooks.usePlotArea();
  const yDom = RechartsHooks.useYAxisDomain(0);
  const fromAxis = parseFinitePair(yDom);
  const viewBox =
    plot != null
      ? { x: plot.x, y: plot.y, width: plot.width, height: plot.height }
      : props.viewBox;
  const trendYDomain = fromAxis ?? props.trendYDomain;
  return (
    <TrendsLineTooltipContent
      {...props}
      viewBox={viewBox}
      trendYDomain={trendYDomain}
    />
  );
}
