import {asset, byId, number, money, openResults, selectOptions, stats, table, lineChart} from '../common.mjs';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

openResults('gridwatch', data => {
  const picker = byId('zone');
  selectOptions('zone', data.zones.map(zone => [zone.name, zone.name === 'ISO NE CA' ? 'New England system' : zone.name]));
  picker.disabled = false;
  byId('status').textContent = `ISO New England · ${data.year} archive · ${number(data.rows)} rows across eight zones and the system series`;
  byId('csv').href = asset('gridwatch', 'hourly.csv');
  function draw() {
    const zone = data.zones.find(row => row.name === picker.value);
    stats([['Hourly observations', number(zone.hours)], ['Mean absolute spread', money(zone.meanAbs)],
           ['95th percentile spread size', money(zone.p95)], ['Hours with |spread| ≥ $25', number(zone.positiveHours + zone.negativeHours)]]);
    lineChart('chart', months, [
      {name:'Mean absolute spread',color:'var(--accent)',values:zone.monthly.map(row=>row.mean_abs)},
      {name:'Mean signed spread',color:'var(--secondary)',dash:'7 5',values:zone.monthly.map(row=>row.mean_signed)},
    ], 'Monthly average absolute and signed price spreads in dollars per megawatt-hour', value=>`$${number(value)}`);
    table('monthly', ['Month','Hours','Mean absolute','Mean signed','≥ +$25','≤ −$25'], zone.monthly.map(row=>[
      months[row.month-1],number(row.hours),money(row.mean_abs),money(row.mean_signed),number(row.positive_hours),number(row.negative_hours),
    ]));
    byId('grid-note').textContent = `Hourly demand deviation and signed spread have a Pearson correlation of ${number(zone.loadCorrelation, 3)} in this series.`;
    table('top', ['Local date','Hour ending','Occurrence','Day-ahead LMP','Real-time LMP','Spread','Demand deviation'], zone.top.map(row=>[
      row.date,row.hr_end,row.occurrence,money(row.da_lmp),money(row.rt_lmp),money(row.spread),`${number(row.load_error, 1)} MW`,
    ]));
  }
  picker.addEventListener('change', draw);
  draw();
});
