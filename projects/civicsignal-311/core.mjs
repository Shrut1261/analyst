export const boroughs = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND'];
const source = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';
export const shift = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
const average = values => values.reduce((total, value) => total + value, 0) / values.length;

async function query(parameters) {
  const url = `${source}?${new URLSearchParams(parameters)}`;
  for (let attempt=0;attempt<3;attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
      if (response.ok) {
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('NYC Open Data returned an unexpected response');
        return rows;
      }
      if (![429,502,503,504].includes(response.status)||attempt===2) throw new Error(`NYC Open Data returned HTTP ${response.status}`);
    } catch(error) {
      if (attempt===2||!['TimeoutError','TypeError'].includes(error.name)) throw error;
    }
    await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)+Math.random()*600));
  }
}

export async function loadSource() {
  const date = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const [latest] = await query({$select:'max(created_date) as latest', $where:`created_date >= '${shift(date,-30)}T00:00:00' AND created_date < '${shift(date,1)}T00:00:00'`});
  const end = latest?.latest?.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end ?? '')) throw new Error('Source has no observations in the last 30 days');
  const start = shift(end, -140);
  const windows = Array.from({length:10}, (_, i)=>[shift(start, i*14), shift(start,(i+1)*14)]);
  const rows = [];
  for (let i=0;i<windows.length;i+=4) {
    const batches = await Promise.all(windows.slice(i,i+4).map(([first,last])=>query({
      $select:'date_trunc_ymd(created_date) as day, borough, count(*) as requests',
      $where:`created_date >= '${first}T00:00:00' AND created_date < '${last}T00:00:00' AND borough in (${boroughs.map(b => `'${b}'`).join(',')})`,
      $group:'date_trunc_ymd(created_date), borough', $order:'day, borough', $limit:'100'
    })));
    for(const batch of batches) rows.push(...batch);
  }
  return {rows, start, end};
}

function features(history, date, scale) {
  const weekday = new Date(date+'T00:00:00Z').getUTCDay();
  return [1, history.at(-1)/scale, history.at(-7)/scale, average(history.slice(-7))/scale,
    ...Array.from({length:6}, (_, i) => Number(weekday === i + 1))];
}

function train(history, dates, scale) {
  const matrix = Array.from({length:10}, () => Array(11).fill(0));
  for (let t=7;t<history.length;t++) {
    const row = features(history.slice(t-7,t), dates[t], scale);
    for (let i=0;i<10;i++) {
      for (let j=0;j<10;j++) matrix[i][j] += row[i]*row[j];
      matrix[i][10] += row[i]*history[t]/scale;
    }
  }
  for (let i=1;i<10;i++) matrix[i][i] += .2;
  for (let i=0;i<10;i++) {
    const pivot = matrix[i][i];
    matrix[i] = matrix[i].map(value => value/pivot);
    for (let j=0;j<10;j++) {
      if (j!==i) {
        const factor=matrix[j][i];
        matrix[j]=matrix[j].map((value,k)=>value-factor*matrix[i][k]);
      }
    }
  }
  return matrix.map(row=>row[10]);
}

function project(history, dates, useML) {
  const scale=Math.max(1,average(history));
  const coefficients=useML?train(history,dates,scale):null;
  const values=[...history];
  for (let i=1;i<=7;i++) {
    const date=shift(dates.at(-1),i);
    const estimate=coefficients?features(values,date,scale).reduce((sum,x,j)=>sum+x*coefficients[j],0)*scale:values.at(-7);
    values.push(Math.max(0,Math.round(estimate)));
  }
  return values.slice(-7);
}

export function build(sourceData) {
  const {rows,start,end}=sourceData;
  const dates=Array.from({length:140},(_,i)=>shift(start,i));
  if(shift(start,140)!==end) throw new Error('Expected 140 complete calendar days');
  const counts=new Map();
  for (const row of rows) {
    const day=row.day?.slice(0,10);
    const key=`${day}|${row.borough}`;
    if(counts.has(key)||!dates.includes(day)||!boroughs.includes(row.borough)||!/^\d+$/.test(String(row.requests))||!Number.isSafeInteger(Number(row.requests))) throw new Error(`Invalid daily count: ${key}`);
    counts.set(key,Number(row.requests));
  }
  if(counts.size!==dates.length*boroughs.length) throw new Error(`Incomplete source: ${counts.size} of 700 borough-day rows`);
  const records=[];
  const metrics=[];
  for(const borough of boroughs) {
    const history=dates.map(day=>counts.get(`${day}|${borough}`));
    const errors={ridge:0,seasonal:0};
    const backtest=[];
    for(let t=112;t<140;t+=7) {
      const ridge=project(history.slice(0,t),dates.slice(0,t),true);
      const seasonal=project(history.slice(0,t),dates.slice(0,t),false);
      ridge.forEach((value,i)=>{
        errors.ridge+=Math.abs(value-history[t+i]);
        errors.seasonal+=Math.abs(seasonal[i]-history[t+i]);
        backtest.push({day:dates[t+i],borough,actual:history[t+i],ridge:value,seasonal:seasonal[i]});
      });
    }
    const useML=errors.ridge<errors.seasonal;
    const model=useML?'Ridge regression':'Weekly seasonal baseline';
    const forecast=project(history,dates,useML);
    history.forEach((requests,i)=>records.push({day:dates[i],borough,scenario:'Actual',requests}));
    forecast.forEach((requests,i)=>records.push({day:shift(end,i),borough,scenario:'Forecast',requests}));
    metrics.push({borough,model,ridge_mae:errors.ridge/28,seasonal_mae:errors.seasonal/28,backtest});
  }
  return {records,metrics,asOf:dates.at(-1),refreshedAt:new Date().toISOString()};
}

export function csv(rows) {
  if(!rows.length) throw new Error('Cannot export an empty table');
  const keys=Object.keys(rows[0]);
  const quote=value=>`"${String(value).replaceAll('"','""')}"`;
  return [keys.join(','),...rows.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\r\n')+'\r\n';
}
