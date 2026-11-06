import {mkdir,rename,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build,csv,loadSource} from './core.mjs';
import {sampleSource} from './sample.mjs';

const simulated=process.argv.includes('--sample');
const dir=resolve(simulated?'sample-output':'public-data');
const snapshot=build(simulated?sampleSource():await loadSource());
await mkdir(dir,{recursive:true});
const tables={
  'snapshot.json':JSON.stringify(snapshot),
  'demand.csv':csv(snapshot.records),
  'backtest.csv':csv(snapshot.metrics.flatMap(m=>m.backtest)),
  'model-metrics.csv':csv(snapshot.metrics.map(({backtest,...metrics})=>metrics)),
};
for(const [name,content] of Object.entries(tables)) {
  const temporary=join(dir,name+'.tmp');
  await writeFile(temporary,content);
  await rename(temporary,join(dir,name));
}
console.log(`${simulated?'Simulated':'NYC Open Data'} · ${snapshot.records.length} rows · observed through ${snapshot.asOf} · ${dir}`);
