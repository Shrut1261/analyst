import {boroughs,shift} from './core.mjs';

export function sampleSource() {
  const start='2026-05-01';
  const rows=Array.from({length:140},(_,i)=>{
    const day=shift(start,i);
    return boroughs.map((borough,j)=>({day,borough,requests:Math.round(
      [850,1500,1150,1290,280][j]*(1+.16*Math.sin(i*2*Math.PI/7))+(i/3)+(i*31+j*19)%75
    )}));
  }).flat();
  return {start,end:shift(start,140),rows};
}
