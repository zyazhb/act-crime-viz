"""Extract structured crime statistics from ACT Policing monthly XLSX export."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}

TABLE_RE = re.compile(
    r"^Table\s+\d+:\s*(.+?)\s*-\s*Offences and other activities\s*$",
    re.I,
)


def parse_period_label(label: str) -> tuple[int, int] | None:
    """MONYY -> (year, month) e.g. MAR26 -> (2026, 3)."""
    if not label or not isinstance(label, str):
        return None
    label = label.strip().upper()
    m = re.match(r"^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})$", label)
    if not m:
        return None
    mon = MONTHS[m.group(1)]
    yy = int(m.group(2))
    year = 2000 + yy if yy <= 50 else 1900 + yy
    return year, mon


def period_sort_key(label: str) -> tuple[int, int]:
    p = parse_period_label(label)
    return p if p else (0, 0)


def district_from_table_title(title: str) -> str | None:
    m = TABLE_RE.match(title.strip())
    return m.group(1).strip() if m else None


def extract_offence_tables(ws) -> list[dict]:
    """Return list of {district, periods: [...], series: {offence: {period: int}}}."""
    rows = list(ws.iter_rows(values_only=True))
    tables: list[dict] = []
    i = 0
    n = len(rows)
    while i < n:
        row = rows[i]
        c0 = row[0] if row else None
        if isinstance(c0, str) and c0.startswith("Table ") and "Offences and other activities" in c0:
            title = c0
            district = district_from_table_title(title)
            if not district:
                i += 1
                continue
            j = i + 1
            periods: list[str] | None = None
            series: dict[str, dict[str, int]] = {}
            while j < n:
                r = rows[j]
                first = r[0] if r else None
                if isinstance(first, str) and first.startswith("Table ") and j > i + 3:
                    break
                if first == "Offence" and r[1] == "Date reported":
                    header = rows[j + 1] if j + 1 < n else None
                    if header and header[0] is None:
                        periods = []
                        for cell in header[1:]:
                            if cell is None:
                                break
                            periods.append(str(cell).strip())
                    j += 2
                    continue
                if periods and first and isinstance(first, str) and first != "Offence":
                    name = first.strip()
                    data: dict[str, int] = {}
                    for k, p in enumerate(periods):
                        val = r[k + 1] if k + 1 < len(r) else None
                        if val is None:
                            continue
                        try:
                            data[p] = int(val)
                        except (TypeError, ValueError):
                            data[p] = 0
                    series[name] = data
                j += 1
            if periods:
                tables.append(
                    {
                        "district": district,
                        "periods": periods,
                        "series": series,
                    }
                )
            i = j
            continue
        i += 1
    return tables


def extract_simple_table(ws, header_row_idx: int) -> tuple[list[str], dict[str, dict[str, int]]]:
    """header_row_idx is 0-based index of row with first cell empty/space and periods from col B."""
    rows = list(ws.iter_rows(values_only=True))
    header = rows[header_row_idx]
    periods: list[str] = []
    for cell in header[1:]:
        if cell is None or (isinstance(cell, str) and not cell.strip()):
            break
        periods.append(str(cell).strip())
    series: dict[str, dict[str, int]] = {}
    for r in rows[header_row_idx + 1 :]:
        label = r[0]
        if label is None:
            continue
        label = str(label).strip()
        if not label or label == " ":
            continue
        data: dict[str, int] = {}
        for k, p in enumerate(periods):
            val = r[k + 1] if k + 1 < len(r) else None
            try:
                data[p] = int(val) if val is not None else 0
            except (TypeError, ValueError):
                data[p] = 0
        series[label] = data
    return periods, series


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    xlsx = root / "Website-Stats-Monthly-Mar26.xls.xlsx"
    out = root / "act-crime-viz" / "public" / "crime-data.json"
    if not xlsx.exists():
        print(f"Missing input: {xlsx}", file=sys.stderr)
        sys.exit(1)

    wb = load_workbook(xlsx, read_only=True, data_only=True)
    offence_ws = wb["Offence Statistics"]
    tables = extract_offence_tables(offence_ws)

    if not tables:
        print("No offence tables parsed", file=sys.stderr)
        sys.exit(1)

    all_periods = sorted(
        {p for t in tables for p in t["periods"]},
        key=period_sort_key,
    )

    traffic_ws = wb["Traffic Statistics - ACT"]
    traffic_periods, traffic_series = extract_simple_table(traffic_ws, 4)

    fv_ws = wb["Family Violence Statistics - AC"]
    fv_periods, fv_series = extract_simple_table(fv_ws, 3)

    payload = {
        "sourceFile": xlsx.name,
        "offenceTables": tables,
        "periodsChronological": all_periods,
        "traffic": {"periods": traffic_periods, "series": traffic_series},
        "familyViolence": {"periods": fv_periods, "series": fv_series},
        "violenceOffenceKeys": [
            "Assault",
            "Homicide",
            "Sexual Assault",
            "Robbery",
            "Offences against a person",
        ],
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
