import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { h2 } from "./dashboardStyles";
import type { DataSourceId } from "./types";

export type CompareRow = { id: string; label: string; value: number };

export type DashboardCompareChartProps = {
  compareChartTitle: string;
  isClusterBar: boolean;
  clusterBarTall: boolean;
  compareBarRows: CompareRow[];
  compareDistrictRows: CompareRow[];
  comparePeriod: string;
  dataSource: DataSourceId;
  t: (path: string, vars?: Record<string, string> | undefined) => string;
};

export default function DashboardCompareChart({
  compareChartTitle,
  isClusterBar,
  clusterBarTall,
  compareBarRows,
  compareDistrictRows,
  comparePeriod,
  dataSource,
  t,
}: DashboardCompareChartProps) {
  return (
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
  );
}
