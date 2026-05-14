export type Locale = "zh" | "en";

const en = {
  documentTitle: "ACT Policing — Crime statistics",
  brand: {
    policing: "ACT Policing",
    title: "Crime statistics",
    source: "Source",
  },
  lang: { zh: "中文", en: "English" },
  nav: {
    overview: "Overview",
    trends: "Trends",
    compare: "Compare",
  },
  trends: {
    composition: "Composition",
    compositionCategories: "Offence / indicator categories",
    pieLegend: "Legend (hovered line)",
    noPositive: "No positive values for a pie chart.",
  },
  app: {
    title: "Australian Capital Territory (ACT) crime statistics",
  },
  metricDesc: {
    total:
      "All recorded offence categories including property, traffic infringements, etc.",
    violence:
      "Violence-related offences: assault, homicide, sexual assault, robbery, and offences against the person.",
    offence: "Summed offence types: {{names}}",
    family: "Family violence (ACT-wide): {{name}}",
    traffic: "Traffic & transport (ACT-wide): {{name}}",
    community:
      "Suburb-level (quarterly): {{district}} · {{categories}}. Values sum selected categories per suburb. Cannot be merged with monthly MAR/FEB series.",
  },
  loading: "Loading statistics…",
  errors: { loadFailed: "Failed to load data ({{status}})" },
  filter: {
    dataSource: "Dataset",
    sourceOffences: "Offence statistics (Tables 1–10, by district)",
    sourceTraffic: "Traffic & transport (Table 11, ACT)",
    sourceFamily: "Family violence (Table 12, ACT)",
    sourceCommunity:
      "Suburb statistics (quarterly workbook; timeline partial vs monthly)",
    commPolicingDistrict: "Policing district (sheet)",
    commCategory: "Offence / indicator categories (multi-select)",
    commSuburbsLegend: "Suburbs (multi-select, excludes Total row)",
    metricKind: "Metric",
    metricTotal: "All offences total",
    metricViolence: "Violence bundle",
    metricOffence: "Offence types (multi-select, summed)",
    trafficMetric: "Traffic indicator",
    familyMetric: "Family violence indicator",
    offenceType: "Offence types (multi-select, summed)",
    periodFrom: "Period from",
    periodTo: "Period to",
    compareMonth: "Comparison month",
    districts: "Districts (multi-select)",
  },
  district: {
    presets: { all: "All", act: "ACT only", suburbs: "Districts only" },
    actWide: "ACT (territory-wide)",
  },
  family: {
    note: "Family violence statistics are ACT-wide and are not broken down by policing district.",
    compareNote: "Only the ACT-wide total applies for this dataset.",
  },
  traffic: {
    note: "Traffic statistics are ACT-wide (Table 11).",
    compareNote: "Bars show each traffic indicator for the selected month.",
  },
  community: {
    note: "Quarterly suburb data covers roughly 2014 Q1–2025 Q2 and does not align with monthly offence tables.",
    compareNote: "Bars show each selected suburb for the chosen quarter.",
  },
  overview: {
    snapshotTitle: "Snapshot at end of selected range",
    catalogTitle: "Workbook structure (3 sheets, 12 tables)",
  },
  table: {
    region: "Region / scope",
    period: "Report month",
    value: "Value",
    tableNo: "Table",
    sheet: "Sheet",
    kind: "Type",
    metrics: "Metrics",
    title: "Title (source)",
    suburb: "Suburb / indicator",
  },
  compare: {
    districtTitle: "District comparison (selected month)",
    metricTitle: "Metric comparison (selected month)",
    suburbTitle: "Suburb comparison (selected quarter)",
  },
  catalog: {
    kindOffence: "Offences",
    kindTraffic: "Traffic",
    kindFamily: "Family violence",
  },
} as const;

const zh = {
  documentTitle: "ACT 警务 · 犯罪统计",
  brand: {
    policing: "ACT 警务",
    title: "犯罪统计",
    source: "来源",
  },
  lang: { zh: "中文", en: "English" },
  nav: {
    overview: "数据概览",
    trends: "历史趋势",
    compare: "对比分析",
  },
  trends: {
    composition: "构成比例",
    compositionCategories: "罪行 / 指标类别",
    pieLegend: "图例（当前鼠标下的折线）",
    noPositive: "无正值，无法绘制构成饼图。",
  },
  app: {
    title: "澳大利亚首都领地（ACT）犯罪与相关统计",
  },
  metricDesc: {
    total: "全部记录罪行合计（含财产类、交通罚单等）。",
    violence: "暴力相关罪行汇总：袭击、凶杀、性侵犯、抢劫及针对人身罪行。",
    offence: "已选罪行相加：{{names}}",
    family: "家庭暴力（全 ACT）：{{name}}",
    traffic: "交通与运输（全 ACT）：{{name}}",
    community:
      "社区（按季度）：{{district}} · {{categories}}。各社区数值为所选类别之和。与月度 MAR/FEB 序列时间轴不一致，无法拼成完整原序列。",
  },
  loading: "正在加载统计数据…",
  errors: { loadFailed: "加载数据失败（{{status}}）" },
  filter: {
    dataSource: "数据表",
    sourceOffences: "罪行统计（表 1–10，按辖区）",
    sourceTraffic: "交通与运输（表 11，全 ACT）",
    sourceFamily: "家庭暴力（表 12，全 ACT）",
    sourceCommunity: "社区统计（季度工作簿；时间范围与月度表不对齐）",
    commPolicingDistrict: "警务辖区（工作表）",
    commCategory: "罪行 / 指标类别（多选）",
    commSuburbsLegend: "社区（多选，不含 Total 汇总行）",
    metricKind: "指标",
    metricTotal: "全部罪行合计",
    metricViolence: "暴力罪行汇总",
    metricOffence: "罪行类别（多选、相加）",
    trafficMetric: "交通指标",
    familyMetric: "家庭暴力指标",
    offenceType: "罪行类别（多选、相加）",
    periodFrom: "时间范围（起）",
    periodTo: "时间范围（止）",
    compareMonth: "对比月份",
    districts: "分区（多选）",
  },
  district: {
    presets: { all: "全选", act: "仅 ACT", suburbs: "仅辖区" },
    actWide: "ACT（全境）",
  },
  family: {
    note: "家庭暴力统计为全 ACT 口径，不按警务辖区拆分。",
    compareNote: "该数据集仅展示全 ACT 一项。",
  },
  traffic: {
    note: "交通统计为全 ACT 口径（表 11）。",
    compareNote: "柱状图为所选月份下各交通指标对比。",
  },
  community: {
    note: "社区季度数据约覆盖 2014 Q1 至 2025 Q2，与月度罪行表颗粒度、起止时间均不同，不能补全全部原序列。",
    compareNote: "柱状图为所选季度下各社区的对比（不含 Total）。",
  },
  overview: {
    snapshotTitle: "当前区间末尾月快照",
    catalogTitle: "工作簿结构（3 个工作表，12 个表格）",
  },
  table: {
    region: "地区 / 范围",
    period: "报告月",
    value: "数值",
    tableNo: "表号",
    sheet: "工作表",
    kind: "类型",
    metrics: "指标数",
    title: "标题（原文）",
    suburb: "社区 / 指标",
  },
  compare: {
    districtTitle: "分区对比（选定月份）",
    metricTitle: "指标对比（选定月份）",
    suburbTitle: "社区对比（选定季度）",
  },
  catalog: {
    kindOffence: "罪行",
    kindTraffic: "交通",
    kindFamily: "家庭暴力",
  },
} as const;

export const uiMessages = { en, zh } as const;

export type MessageTree = typeof en;
