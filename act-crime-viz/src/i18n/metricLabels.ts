import type { Locale } from "./uiMessages";

const DISTRICT_ZH: Record<string, string> = {
  ACT: "ACT（全境）",
  Belconnen: "Belconnen（贝尔康嫩）",
  Gungahlin: "Gungahlin（冈加林）",
  "Inner North": "Inner North（内北）",
  "Inner South": "Inner South（内南）",
  Weston: "Weston（韦斯顿）",
  "Molonglo District": "Molonglo（莫朗格洛）",
  Woden: "Woden（沃登）",
  Tuggeranong: "Tuggeranong（塔格拉农）",
  "Other Areas": "其他区域",
};

const OFFENCE_ZH: Record<string, string> = {
  Assault: "袭击",
  Burglary: "入室盗窃",
  Homicide: "凶杀",
  "Motor vehicle theft": "机动车盗窃",
  "Offences against a person": "针对人身的犯罪",
  "Other offences": "其他罪行",
  "Property damage": "财产损毁",
  "Road Collision with injury": "道路碰撞致伤",
  "Road Fatality": "道路死亡",
  Robbery: "抢劫",
  "Sexual Assault": "性侵犯",
  "Theft (excluding motor vehicles)": "盗窃（不含机动车）",
  "Traffic infringement notices": "交通违章通知",
  Total: "合计",
};

const TRAFFIC_ZH: Record<string, string> = {
  "Total Traffic Infringement Notices (TINs) (including speeding)":
    "交通违章通知总数（含超速）",
  "Total Traffic Infringement cautions (including speeding)":
    "交通违章告诫总数（含超速）",
  "Speeding TINs": "超速违章通知",
  "Speeding cautions": "超速告诫",
  "Number of persons charged with drink driving offences": "酒驾被检控人数",
  "Person charged with unlicenced driving offences - licence disqualified or suspended":
    "无照/吊销驾照驾驶被检控人数",
  "Person charged with unlicenced driving offences - licence never held":
    "从未持有驾照驾驶被检控人数",
  "Road crashes resulting in injury (not fatalities)":
    "道路碰撞致伤（不含死亡）",
  "Road crashes resulting in death": "道路碰撞致死",
};

const FAMILY_ZH: Record<string, string> = {
  "Family violence related incidents": "家庭暴力相关事件",
  "Family violence related offences": "家庭暴力相关罪行",
  "Family violence related assault offences": "家庭暴力相关袭击罪行",
  "Number of offenders apprehended where family violence related":
    "家庭暴力相关被拘捕人数",
};

const COMMUNITY_CAT_ZH: Record<string, string> = {
  "Assault - FV": "袭击（家庭暴力相关）",
  "Assault - Non-FV": "袭击（非家庭暴力相关）",
  "Burglary dwellings": "入室盗窃（住宅）",
  "Burglary other": "入室盗窃（其他）",
  "Burglary shops": "入室盗窃（商铺）",
  CINs: "刑事侵权通知（CIN）",
  "Motor vehicle theft": "机动车盗窃",
  "Other offences": "其他罪行",
  "Other offences against a person": "其他针对人身罪行",
  "Property damage": "财产损毁",
  "Robbery - armed": "武装抢劫",
  "Robbery - other": "其他抢劫",
  "Sexual Assault": "性侵犯",
  "TINs Mobile Use": "交通违章：使用手机",
  "TINs Other": "交通违章：其他",
  "TINs Seatbelts": "交通违章：安全带",
  "TINs Speeding": "交通违章：超速",
  "Theft (excluding Motor Vehicles)": "盗窃（不含机动车）",
};

const METRIC_ZH: Record<string, string> = {
  ...OFFENCE_ZH,
  ...TRAFFIC_ZH,
  ...FAMILY_ZH,
  ...COMMUNITY_CAT_ZH,
};

export function metricLabel(locale: Locale, key: string): string {
  if (locale === "en") return key;
  return METRIC_ZH[key] ?? key;
}

export function districtLabel(locale: Locale, key: string): string {
  if (locale === "en") return key;
  return DISTRICT_ZH[key] ?? key;
}
