// Opt-in network smoke checks. Public GETs only. Never reads credential env vars.
import fs from 'node:fs/promises';
import {Engine} from '../src/engine.js';
import {unpackCompiled} from '../src/compiler.js';
const samples=[
 {id:'github',operationId:'repos/get',args:{path:{owner:'octocat',repo:'Hello-World'}},check:r=>r.data.full_name==='octocat/Hello-World'},
 {id:'exchange-rates',path:'/latest/{base_currency}',args:{path:{base_currency:'USD'}},check:r=>r.data.base==='USD' && typeof r.data.rates?.EUR==='number'},
 {id:'wikimedia',path:'/metrics/pageviews/aggregate/{project}/{access}/{agent}/{granularity}/{start}/{end}',args:{path:{project:'en.wikipedia.org',access:'all-access',agent:'user',granularity:'daily',start:'2025010100',end:'2025010100'}},check:r=>Array.isArray(r.data.items) && r.data.items.length>0},
 {id:'twitter',operationId:'getOpenApiSpec',args:{},check:r=>!!r.data.openapi}
];
const results=[];
for(const s of samples) {
 try {
  const c=unpackCompiled(JSON.parse(await fs.readFile(`generated/${s.id}.json`,'utf8')));
  const op=c.tools.find(t=>s.operationId?t.operationId===s.operationId:t.path===s.path);
  if(!op || op.method!=='GET' || op.security.length)throw new Error('No matching anonymous GET operation');
  const engine=new Engine([{compiled:c}]);const r=await engine.execute(op.name,s.args);
  const passed=r.ok && s.check(r);
  results.push({provider:s.id,operation:op.name,status:r.status,passed,authenticated:false,scope:'One anonymous read endpoint, not whole-provider certification'});
 }catch(e){results.push({provider:s.id,passed:false,authenticated:false,error:e.message});}
 console.log(results.at(-1));
}
await fs.writeFile('docs/public-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
