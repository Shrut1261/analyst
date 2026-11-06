"""Build GridWatch from the official ISO New England SMD workbook."""
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen
import json
import sys

import pandas as pd

URL = 'https://www.iso-ne.com/static-assets/documents/100020/2025_smd_hourly.xlsx'
COLUMNS = ['date', 'hr_end', 'da_demand', 'rt_demand', 'da_lmp', 'rt_lmp']


def normalize(name):
    return str(name).strip().lower().replace(' ', '_')


def build(output, source):
    output.mkdir(parents=True, exist_ok=True)
    workbook = pd.ExcelFile(source)
    zones = []
    detail = []
    for sheet in workbook.sheet_names:
        raw = workbook.parse(sheet, header=None)
        headings = next((i for i in range(min(30, len(raw)))
                         if set(COLUMNS).issubset({normalize(v) for v in raw.iloc[i]})), None)
        if headings is None:
            continue
        frame = raw.iloc[headings + 1:].copy()
        frame.columns = [normalize(v) for v in raw.iloc[headings]]
        frame = frame[COLUMNS].copy()
        frame['date'] = pd.to_datetime(frame['date'], errors='coerce')
        frame = frame[frame['date'].dt.year.eq(2025)].copy()
        if frame.empty:
            continue
        frame['hr_end'] = frame['hr_end'].astype(str).str.replace(r'\.0$', '', regex=True).str.strip()
        for col in COLUMNS[2:]:
            frame[col] = pd.to_numeric(frame[col], errors='coerce')
        invalid = int(frame[COLUMNS[2:]].isna().any(axis=1).sum())
        frame = frame.dropna(subset=COLUMNS[2:]).copy()
        assert 8700 <= len(frame) <= 8800, (sheet, len(frame), invalid)
        assert frame['date'].nunique() == 365, sheet
        assert frame.groupby('date').size().between(23, 25).all(), sheet
        # Preserve the source's DST convention and distinguish repeated local hour labels.
        frame['occurrence'] = frame.groupby(['date', 'hr_end']).cumcount() + 1
        frame['spread'] = frame['rt_lmp'] - frame['da_lmp']
        frame['load_error'] = frame['rt_demand'] - frame['da_demand']
        frame['absolute_spread'] = frame['spread'].abs()
        frame['zone'] = sheet
        detail.append(frame)
        daily = frame.groupby('date').agg(hours=('spread', 'size'), mean_abs=('absolute_spread', 'mean'),
                                          mean_signed=('spread', 'mean'), demand=('rt_demand', 'mean')).round(2)
        top = frame.nlargest(12, 'absolute_spread')[['date', 'hr_end', 'occurrence', 'da_lmp', 'rt_lmp', 'spread', 'load_error']].copy()
        top['date'] = top['date'].dt.strftime('%Y-%m-%d')
        monthly = frame.assign(month=frame['date'].dt.month).groupby('month').agg(
            hours=('spread', 'size'), mean_abs=('absolute_spread', 'mean'), mean_signed=('spread', 'mean'),
            positive_hours=('spread', lambda v: int((v >= 25).sum())), negative_hours=('spread', lambda v: int((v <= -25).sum())),
            demand=('rt_demand', 'mean')).round(2).reset_index()
        zones.append({'name': sheet, 'hours': len(frame), 'invalid': invalid,
                      'meanAbs': round(float(frame['absolute_spread'].mean()), 2),
                      'p95': round(float(frame['absolute_spread'].quantile(.95)), 2),
                      'positiveHours': int((frame['spread'] >= 25).sum()),
                      'negativeHours': int((frame['spread'] <= -25).sum()),
                      'loadCorrelation': round(float(frame['spread'].corr(frame['load_error'])), 3),
                      'monthly': monthly.to_dict('records'), 'top': top.round(2).to_dict('records')})
    assert len(zones) == 9, [z['name'] for z in zones]
    combined = pd.concat(detail, ignore_index=True)
    assert not combined.duplicated(['zone', 'date', 'hr_end', 'occurrence']).any()
    combined.to_csv(output / 'hourly.csv', index=False, float_format='%.4f', date_format='%Y-%m-%d')
    payload = {'year': 2025, 'rows': len(combined), 'zones': zones, 'source': URL}
    (output / 'results.json').write_text(json.dumps(payload, allow_nan=False), encoding='utf-8')
    print(f"GridWatch: {len(combined):,} hourly rows, {len(zones)} series; highest mean absolute spread: "
          f"{max(zones, key=lambda z: z['meanAbs'])['name']}", flush=True)


if __name__ == '__main__':
    if len(sys.argv) > 2:
        build(Path(sys.argv[1]), sys.argv[2])
    else:
        with urlopen(URL, timeout=120) as response:
            build(Path(sys.argv[1]), BytesIO(response.read()))
