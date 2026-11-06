import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {boroughs} from './core.mjs';
import {generateBrief} from './brief.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const model=process.env.OLLAMA_MODEL;
const port=Number(process.env.CIVICSIGNAL_PORT||4174);
const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.md':'text/plain','.txt':'text/plain','.dax':'text/plain','.pq':'text/plain','.json':'application/json','.csv':'text/csv'};
function json(response,status,body) {
  response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  response.end(JSON.stringify(body));
}

createServer(async(request,response)=>{
  try {
    if(!['127.0.0.1:'+port,'localhost:'+port].includes(request.headers.host)) return json(response,403,{error:'Local host required'});
    const url=new URL(request.url,'http://127.0.0.1');
    if(request.method==='GET'&&url.pathname==='/api/config') return json(response,200,{genai:Boolean(model)});
    if(request.method==='POST'&&url.pathname==='/api/brief') {
      if(!model) return json(response,503,{error:'Set OLLAMA_MODEL to enable local drafts.'});
      if(request.headers.origin!==`http://${request.headers.host}`||request.headers['content-type']!=='application/json') return json(response,403,{error:'Same-origin JSON required'});
      let body='';
      for await(const chunk of request) {
        body+=chunk;
        if(body.length>4096) return json(response,413,{error:'Payload too large'});
      }
      let facts;
      try {facts=JSON.parse(body);} catch {return json(response,400,{error:'Invalid JSON'});}
      const numeric=['capacity','lastWeek','nextWeek','peakRequests','aboveDays','excess'];
      if(!facts||!boroughs.includes(facts.borough)||!/^\d{4}-\d{2}-\d{2}$/.test(facts.peakDate)||!numeric.every(key=>Number.isSafeInteger(facts[key])&&facts[key]>=0&&facts[key]<=100000000)||facts.aboveDays>7) return json(response,400,{error:'Invalid planning facts'});
      try {return json(response,200,await generateBrief(facts,model));}
      catch(error) {return json(response,502,{error:error.message});}
    }
    if(request.method!=='GET') return json(response,405,{error:'Method not allowed'});
    const pathname=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+sep)||!Object.hasOwn(types,extname(path))) return json(response,404,{error:'Not found'});
    const content=await readFile(path);
    response.writeHead(200,{'Content-Type':types[extname(path)]+'; charset=utf-8','X-Content-Type-Options':'nosniff'});
    response.end(content);
  } catch(error) {
    json(response,error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'Not found':'Request could not be processed'});
  }
}).listen(port,'127.0.0.1',()=>console.log(`CivicSignal 311: http://127.0.0.1:${port}/`));
