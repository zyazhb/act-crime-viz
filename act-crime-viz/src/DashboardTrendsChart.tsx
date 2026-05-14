import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { h2 } from "./dashboardStyles";
import { colorForSeriesKey } from "./seriesColor";
import {
  type CommunityPieCtx,
  TrendsLineTooltipWithLayout,
} from "./trendsLineTooltip";
import type { CrimePayload, DataSourceId, MetricMode } from "./types";

export type DashboardTrendsChartProps = {
  trendRows: Record<string, string | number>[];
  xInterval: number;
  trendYDomain: readonly [number, number];
  dataSource: DataSourceId;
  communityQuarterly: CrimePayload["communityQuarterly"];
  commDistrict: string;
  commSuburbs: readonly string[];
  commCategories: readonly string[];
  metricMode: MetricMode;
  selectedDistricts: readonly string[];
  actWideKey: string;
  t: (path: string, vars?: Record<string, string> | undefined) => string;
  tMetric: (key: string) => string;
  tDistrict: (key: string) => string;
};

export default function DashboardTrendsChart({
  trendRows,
  xInterval,
  trendYDomain,
  dataSource,
  communityQuarterly,
  commDistrict,
  commSuburbs,
  commCategories,
  metricMode,
  selectedDistricts,
  actWideKey,
  t,
  tMetric,
  tDistrict,
}: DashboardTrendsChartProps) {
  const communityPie: CommunityPieCtx | undefined =
    dataSource === "community" && communityQuarterly
      ? {
          cq: communityQuarterly,
          district: commDistrict,
          selectedSuburbs: commSuburbs,
          categoryKeys: commCategories,
        }
      : undefined;

  return (
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
            <YAxis
              domain={[0, "auto"]}
              tick={{ fill: "#7a8aa3", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                margin: 0,
                padding: 0,
                background: "transparent",
                border: "none",
                boxShadow: "none",
              }}
              cursor={{
                stroke: "#8892a8",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              wrapperStyle={{ zIndex: 20 }}
              content={(tipProps) => (
                <TrendsLineTooltipWithLayout
                  active={tipProps.active}
                  label={tipProps.label}
                  payload={tipProps.payload}
                  coordinate={tipProps.coordinate}
                  activeIndex={tipProps.activeIndex}
                  accessibilityLayer={tipProps.accessibilityLayer}
                  t={t}
                  tMetric={tMetric}
                  dataSource={dataSource}
                  communityPie={communityPie}
                  trendYDomain={trendYDomain}
                />
              )}
            />
            <Legend />
            {dataSource === "community" ? (
              commSuburbs.map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  name={s}
                  stroke={colorForSeriesKey(s)}
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
                stroke={colorForSeriesKey(actWideKey)}
                dot={false}
                strokeWidth={2}
              />
            ) : (
              selectedDistricts.map((d) => (
                <Line
                  key={d}
                  type="monotone"
                  dataKey={d}
                  name={tDistrict(d)}
                  stroke={colorForSeriesKey(d)}
                  dot={false}
                  strokeWidth={2}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
