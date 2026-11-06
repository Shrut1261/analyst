"""Model scheduled-flight disruption from official BTS monthly files."""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import json
import sys

import numpy as np
import pandas as pd
import requests
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score

AIRPORTS = ['BOS', 'BWI', 'DCA', 'EWR', 'IAD', 'JFK', 'LGA', 'PHL']
MONTHS = [6, 7, 8]
YEAR = 2026
SOURCE = 'https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_'
INPUTS = ['Origin', 'Dest', 'Reporting_Airline', 'DayOfWeek', 'Hour', 'Distance', 'CRSElapsedTime']
FIELDS = ['FlightDate', 'CRSDepTime', 'Cancelled', 'Diverted', 'ArrDel15', *[col for col in INPUTS if col != 'Hour']]


def read_month(month):
    url = f'{SOURCE}{YEAR}_{month}.zip'
    response = requests.get(url, timeout=(25, 150))
    response.raise_for_status()
    with ZipFile(BytesIO(response.content)) as bundle:
        member, = [name for name in bundle.namelist() if name.lower().endswith('.csv')]
        with bundle.open(member) as file:
            blocks = [block[block.Origin.isin(AIRPORTS)] for block in pd.read_csv(file, usecols=FIELDS, chunksize=100_000)]
    frame = pd.concat(blocks, ignore_index=True)
    assert len(frame) > 30_000 and set(frame.Origin) == set(AIRPORTS), (month, len(frame))
    date = pd.to_datetime(frame.FlightDate, errors='raise')
    assert date.dt.year.eq(YEAR).all() and date.dt.month.eq(month).all(), month
    has_outcome = (frame.Cancelled.eq(1) | frame.Diverted.eq(1) | frame.ArrDel15.isin([0, 1]))
    excluded = int((~has_outcome).sum())
    frame = frame[has_outcome].copy()
    frame['Hour'] = (frame.CRSDepTime // 100) % 24
    frame['Disrupted'] = (frame.Cancelled.eq(1) | frame.Diverted.eq(1) | frame.ArrDel15.eq(1)).astype(int)
    assert frame[INPUTS].notna().all().all(), month
    assert frame.Disrupted.nunique() == 2
    print(f'{YEAR}-{month:02d}: {len(frame):,} usable departures; {excluded:,} missing outcomes', flush=True)
    return frame, excluded, url


def features(train, frames):
    categories = {col: {name: i for i, name in enumerate(train[col].value_counts().head(150).index)} for col in INPUTS[:3]}
    result = []
    for frame in frames:
        data = frame[INPUTS].copy()
        for col, mapping in categories.items():
            data[col] = data[col].map(mapping).fillna(len(mapping))
        result.append(data.to_numpy(dtype=float))
    return result


def measure(label, target, scores, validation_scores):
    threshold = float(np.quantile(validation_scores, .80))
    alerted = scores >= threshold
    positives = target.astype(bool)
    return {'name': label, 'rocAuc': float(roc_auc_score(target, scores)),
            'averagePrecision': float(average_precision_score(target, scores)),
            'brier': float(brier_score_loss(target, scores)), 'threshold': threshold,
            'alertRate': float(alerted.mean()), 'recall': float(alerted[positives].mean()),
            'precision': float(positives[alerted].mean()) if alerted.any() else None}


def summarize(frame, keys):
    data = frame.groupby(keys).agg(departures=('Disrupted', 'size'), disrupted=('Disrupted', 'sum'),
                                   cancelled=('Cancelled', 'sum'), predicted=('Risk', 'mean')).reset_index()
    data['rate'] = data.disrupted / data.departures
    return data


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    train_result, validation_result, test_result = [read_month(m) for m in MONTHS]
    train, valid, test = [result[0] for result in (train_result, validation_result, test_result)]
    xtrain, xvalid, xtest = features(train, [train, valid, test])
    target = test.Disrupted.to_numpy()
    rates = train.groupby('Origin').Disrupted.mean()
    base_validation = valid.Origin.map(rates).to_numpy()
    base_test = test.Origin.map(rates).to_numpy()
    model = HistGradientBoostingClassifier(categorical_features=[True, True, True, False, False, False, False],
                                           max_iter=120, max_leaf_nodes=20, l2_regularization=2, random_state=311,
                                           early_stopping=False)
    model.fit(xtrain, train.Disrupted)
    predicted_validation = model.predict_proba(xvalid)[:, 1]
    predicted_test = model.predict_proba(xtest)[:, 1]
    test['Risk'] = predicted_test
    methods = [measure('Historical airport baseline', target, base_test, base_validation),
               measure('Gradient boosted trees', target, predicted_test, predicted_validation)]
    airports = summarize(test, 'Origin')
    routes = summarize(test, ['Origin', 'Dest'])
    routes = routes[routes.departures.ge(100)].copy()
    by_hour = summarize(test, ['Origin', 'Hour'])
    by_day = summarize(test, ['Origin', 'FlightDate'])
    routes.to_csv(output / 'routes.csv', index=False, float_format='%.6f')
    by_day.to_csv(output / 'daily.csv', index=False, float_format='%.6f')
    assert int(airports.departures.sum()) == len(test)
    assert int(by_hour.disrupted.sum()) == int(target.sum())
    data = {'year': YEAR, 'months': MONTHS, 'airports': airports.round(5).to_dict('records'),
            'hourly': by_hour.round(5).to_dict('records'), 'methods': methods,
            'testPrevalence': float(target.mean()), 'testDisrupted': int(target.sum()),
            'counts': [len(train), len(valid), len(test)],
            'excluded': [r[1] for r in (train_result, validation_result, test_result)],
            'routes': {airport: routes[routes.Origin.eq(airport)].nlargest(10, 'rate').round(5).to_dict('records') for airport in AIRPORTS},
            'sources': [r[2] for r in (train_result, validation_result, test_result)]}
    (output / 'results.json').write_text(json.dumps(data, allow_nan=False), encoding='utf-8')
    print(f'Holdout disruption prevalence: {data["testPrevalence"]:.4f}. Models: {methods}', flush=True)


if __name__ == '__main__':
    build(Path(sys.argv[1]))
