import {asset, byId, number, percent, openResults, selectOptions, stats, table, lineChart} from '../common.mjs';

openResults('flight-disruption', data => {
  const picker = byId('airport');
  selectOptions('airport', data.airports.map(row => [row.Origin, row.Origin]));
  picker.disabled = false;
  byId('status').textContent = `BTS reporting carriers · August ${data.year} holdout · ${number(data.counts[2])} scheduled departures across eight origins`;
  byId('route-csv').href = asset('flight-disruption', 'routes.csv');
  byId('daily-csv').href = asset('flight-disruption', 'daily.csv');
  byId('test-note').textContent = `${number(data.counts[0])} June training flights, ${number(data.counts[1])} July calibration flights, and ${number(data.counts[2])} August test flights. The observed August disruption rate was ${percent(data.testPrevalence)}.`;
  table('comparison', ['Model','ROC AUC','Average precision','Brier loss','Alert share','Alert precision','Recall'], data.methods.map(row => [
    row.name,number(row.rocAuc,3),number(row.averagePrecision,3),number(row.brier,3),percent(row.alertRate),row.precision === null ? '—' : percent(row.precision),percent(row.recall),
  ]));
  function draw() {
    const airport = data.airports.find(row => row.Origin === picker.value);
    stats([['Departures',number(airport.departures)], ['Disruptions',number(airport.disrupted)],
           ['Observed disruption rate',percent(airport.rate)], ['Cancelled flights',number(airport.cancelled)]]);
    const rows = data.hourly.filter(row => row.Origin === airport.Origin);
    const hours = Array.from({length:24}, (_, hour) => String(hour).padStart(2, '0'));
    const series = property => hours.map((_, hour) => {
      const row = rows.find(item => item.Hour === hour);
      return row?.departures >= 30 ? row[property] : null;
    });
    lineChart('chart', hours, [
      {name:'Observed disruption rate',color:'var(--accent)',values:series('rate')},
      {name:'Mean predicted risk',color:'var(--secondary)',dash:'7 5',values:series('predicted')},
    ], 'Observed and predicted disruption rates by local scheduled departure hour', percent);
    table('hours', ['Local hour','Departures','Disruptions','Observed rate','Mean predicted risk'], rows.map(row => [
      `${hours[row.Hour]}:00`,number(row.departures),number(row.disrupted),percent(row.rate),percent(row.predicted),
    ]));
    table('routes', ['Route','Departures','Disruptions','Observed rate','Mean predicted risk'], data.routes[airport.Origin].map(row => [
      `${row.Origin} → ${row.Dest}`,number(row.departures),number(row.disrupted),percent(row.rate),percent(row.predicted),
    ]));
  }
  picker.addEventListener('change', draw);
  draw();
});
