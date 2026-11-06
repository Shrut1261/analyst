export function plan(snapshot, borough, capacity) {
  const records = snapshot.records.filter(row => row.borough === borough);
  const past = records.filter(row => row.scenario === 'Actual').slice(-7);
  const next = records.filter(row => row.scenario === 'Forecast');
  const total = rows => rows.reduce((sum,row) => sum+row.requests,0);
  const peak = next.reduce((a,b)=>a.requests>=b.requests?a:b);
  const above = next.filter(row=>row.requests>capacity);
  return {borough, asOf:snapshot.asOf, capacity, lastWeek:total(past), nextWeek:total(next),
    peakDate:peak.day, peakRequests:peak.requests, aboveDays:above.length,
    excess:above.reduce((sum,row)=>sum+row.requests-capacity,0)};
}

export function evidence(p) {
  return {
    volume:`${p.nextWeek.toLocaleString('en-US')} requests forecast over the next seven days versus ${p.lastWeek.toLocaleString('en-US')} in the last seven observed days.`,
    peak:`Peak demand is ${p.peakRequests.toLocaleString('en-US')} requests on ${p.peakDate}.`,
    capacity:`${p.aboveDays} forecast days exceed the assumed capacity of ${p.capacity.toLocaleString('en-US')} requests per day, totaling ${p.excess.toLocaleString('en-US')} requests above capacity.`,
  };
}

export async function generateBrief(p, model) {
  const facts=evidence(p);
  const schema={type:'object',properties:{
    summary:{type:'string',maxLength:350}, action:{type:'string',maxLength:350},
    evidence:{type:'array',items:{type:'string',enum:Object.keys(facts)},minItems:1,maxItems:3}
  },required:['summary','action','evidence'],additionalProperties:false};
  const result=await fetch('http://127.0.0.1:11434/api/chat',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
    body:JSON.stringify({model,stream:false,format:schema,options:{temperature:0},messages:[
      {role:'system',content:'Draft a short demand planning brief. Use only supplied evidence. Cite evidence IDs. Keep all numbers, dates, borough names and factual details in the citations. Do not assert causes, service levels, staff counts or official commitments. Suggest a human review action. Output JSON matching '+JSON.stringify(schema)},
      {role:'user',content:JSON.stringify(facts)}
    ]})
  });
  if(!result.ok) throw new Error('Ollama returned HTTP '+result.status);
  const response=JSON.parse((await result.json()).message.content);
  const {summary,action,evidence:ids}=response;
  if(Object.keys(response).length!==3||![summary,action].every(value=>typeof value==='string'&&value.trim().length>0&&value.length<=350&&!/[0-9]/.test(value))||!Array.isArray(ids)||ids.length<1||ids.length>3||!ids.every(id=>Object.hasOwn(facts,id))) throw new Error('Model output did not pass brief validation');
  return {summary,action,evidence:[...new Set(ids)].map(id=>facts[id])};
}
