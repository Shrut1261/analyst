import {boroughs,build,csv,loadSource} from './core.mjs';
import {plan,evidence} from './brief.mjs';
import {sampleSource} from './sample.mjs';

const get=id=>document.getElementById(id);
const fmt=value=>value.toLocaleString('en-US');
const displayDate=date=>date.slice(5).replace('-','/');
let snapshot;
let mode;
let renderedPlan;
let revision=0;
let refreshRevision=0;
let localAI=false;
for(const borough of boroughs) get('borough').add(new Option(borough.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),borough));

function download(rows,name) {
  const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=`${mode==='simulated'?'simulated-':''}${name}.csv`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function chart(rows,capacity) {
  const width=640,height=250,left=54,right=620,top=14,bottom=212;
  const maximum=Math.max(1,capacity,...rows.map(row=>row.requests));
  const x=i=>left+(right-left)*i/(rows.length-1);
  const y=v=>bottom-(bottom-top)*v/maximum;
  const points=(from,to)=>rows.slice(from,to).map((row,i)=>`${x(i+from)},${y(row.requests)}`).join(' ');
  const grid=[0,.25,.5,.75,1].map(f=>`<path d="M${left} ${y(maximum*f)}H${right}" stroke="#344653"/><text x="${left-6}" y="${y(maximum*f)+4}" text-anchor="end">${fmt(Math.round(maximum*f))}</text>`).join('');
  const dates=[0,7,14,21,27].map(i=>`<text x="${x(i)}" y="236" text-anchor="middle">${displayDate(rows[i].day)}</text>`).join('');
  get('chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Line chart of observed requests, forecast requests, and assumed capacity"><rect x="${x(20.5)}" y="${top}" width="${right-x(20.5)}" height="${bottom-top}" fill="#8df4ca" opacity=".07"/>${grid}<path d="M${left} ${y(capacity)}H${right}" stroke="#ffd38b" stroke-width="2" stroke-dasharray="6 4"/><polyline points="${points(0,21)}" fill="none" stroke="#8df4ca" stroke-width="3"/><polyline points="${points(20,28)}" fill="none" stroke="#8cbaff" stroke-width="3" stroke-dasharray="6 4"/>${dates}</svg><div class="legend"><span style="--swatch:#8df4ca">Observed</span><span style="--swatch:#8cbaff">Forecast</span><span style="--swatch:#ffd38b">Capacity</span></div>`;
}

function showFacts(items) {
  get('facts').replaceChildren(...items.map(value=>Object.assign(document.createElement('li'),{textContent:value})));
}

function render(resetCapacity=false) {
  revision++;
  const borough=get('borough').value;
  const actual=snapshot.records.filter(row=>row.borough===borough&&row.scenario==='Actual').slice(-21);
  if(resetCapacity) get('capacity').value=Math.round(actual.slice(-7).reduce((sum,row)=>sum+row.requests,0)/7);
  const capacity=get('capacity').valueAsNumber;
  if(!get('capacity').validity.valid||!Number.isInteger(capacity)) {
    get('capacity').reportValidity();
    get('genai').disabled=true;
    renderedPlan=null;
    get('ai-status').textContent='Enter a whole number from 0 to 1,000,000 to update the scenario.';
    return;
  }
  const p=renderedPlan=plan(snapshot,borough,capacity);
  const forecast=snapshot.records.filter(row=>row.borough===borough&&row.scenario==='Forecast');
  get('metrics').innerHTML=[['Last 7 observed days',p.lastWeek],['Next 7 forecast days',p.nextWeek],['Days over capacity',p.aboveDays],['Volume above capacity',p.excess]].map(([label,value])=>`<div><dt>${label}</dt><dd>${fmt(value)}</dd></div>`).join('');
  chart([...actual,...forecast],capacity);
  get('forecast-table').innerHTML=`<table><thead><tr><th scope="col">Date</th><th scope="col">Requests</th><th scope="col">Above capacity</th></tr></thead><tbody>${forecast.map(row=>`<tr><td>${row.day}</td><td>${fmt(row.requests)}</td><td>${fmt(Math.max(0,row.requests-capacity))}</td></tr>`).join('')}</tbody></table>`;
  const m=snapshot.metrics.find(row=>row.borough===borough);
  get('model').textContent=`Selected: ${m.model}. Mean absolute error: ${m.ridge_mae.toFixed(1)} requests/day for ridge regression and ${m.seasonal_mae.toFixed(1)} for the weekly baseline.`;
  get('brief-title').textContent='Evidence summary';
  get('brief-text').textContent=`${get('borough').selectedOptions[0].text} · ${mode==='simulated'?'Simulated data':'Observed through '+snapshot.asOf}`;
  showFacts(Object.values(evidence(p)));
  get('action').textContent=p.aboveDays?'Review the flagged days against expected coverage and confirm whether requests can be shifted or triaged.':'Monitor the next refresh and reassess if forecast demand or capacity changes.';
  get('ai-status').textContent='';
  get('genai').hidden=!localAI;
  get('genai').disabled=false;
}

function show(next,kind) {
  snapshot=next;
  mode=kind;
  get('dashboard').hidden=false;
  render(true);
}

async function refresh() {
  const request=++refreshRevision;
  get('refresh').disabled=true;
  get('status').textContent='Connecting to NYC Open Data…';
  if(!snapshot) {
    try {
      const response=await fetch('https://raw.githubusercontent.com/Shrut1261/analyst/civicsignal-data/snapshot.json',{signal:AbortSignal.timeout(5000)});
      if(!response.ok) throw new Error('No published snapshot');
      const published=await response.json();
      if(request!==refreshRevision) return;
      show(published,'published');
      get('status').textContent=`Published NYC snapshot · observed through ${published.asOf} · checking for newer data…`;
      get('sample-controls').hidden=true;
    } catch { /* Try the upstream feed directly. */ }
  }
  if(request!==refreshRevision) return;
  try {
    const next=build(await loadSource());
    if(request!==refreshRevision) return;
    show(next,'live');
    get('status').textContent=`NYC Open Data · observed through ${next.asOf} · source queried ${new Date(next.refreshedAt).toLocaleString()}.`;
    get('sample-controls').hidden=true;
  } catch(error) {
    if(request!==refreshRevision) return;
    get('status').textContent=mode==='published'
      ? `Published NYC snapshot · observed through ${snapshot.asOf}. The live connection is unavailable.`
      : `Live refresh unavailable. ${error.message}.${snapshot?' The previous '+mode+' view is still displayed.':''}`;
    get('sample-controls').hidden=false;
  } finally {
    if(request===refreshRevision) get('refresh').disabled=false;
  }
}

get('refresh').addEventListener('click',refresh);
get('sample').addEventListener('click',()=>{
  refreshRevision++;
  get('refresh').disabled=false;
  show(build(sampleSource()),'simulated');
  get('status').textContent='Simulated demo · example data only. Refresh to try the NYC feed again.';
  get('sample-controls').hidden=true;
});
get('borough').addEventListener('change',()=>render(true));
get('capacity').addEventListener('change',()=>render());
get('export').addEventListener('click',()=>download(snapshot.records,'civicsignal-demand'));
get('backtest').addEventListener('click',event=>{
  event.preventDefault();
  download(snapshot.metrics.flatMap(m=>m.backtest),'civicsignal-backtest');
});
get('genai').addEventListener('click',async()=>{
  if(!renderedPlan) return;
  const current=++revision;
  get('genai').disabled=true;
  get('ai-status').textContent='Drafting with your local model…';
  try {
    const response=await fetch('/api/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(renderedPlan)});
    const brief=await response.json();
    if(!response.ok) throw new Error(brief.error);
    if(revision!==current) return;
    get('brief-title').textContent='GenAI draft · review before use';
    get('brief-text').textContent=brief.summary;
    showFacts(brief.evidence);
    get('action').textContent=brief.action;
    get('ai-status').textContent='';
  } catch(error) {
    if(revision===current) get('ai-status').textContent='Local draft unavailable. '+error.message;
  } finally {
    if(revision===current) get('genai').disabled=false;
  }
});
if(['127.0.0.1','localhost'].includes(location.hostname)) {
  fetch('/api/config').then(response=>response.json()).then(config=>{
    localAI=config.genai===true;
    if(snapshot) get('genai').hidden=!localAI;
  }).catch(()=>{});
}
get('sample-controls').hidden=false;
refresh();
