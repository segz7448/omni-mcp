// Anonymous/public smoke tests. Runs through the default config and actual MCP client.
// One operation per service proves only that operation, not the whole provider.
import fs from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cases=[
 {provider:'github',operation:'github__repos_get',query:'repos_get',args:{path:{owner:'octocat',repo:'Hello-World'}},check:d=>d.data.full_name==='octocat/Hello-World'},
 {provider:'wikimedia',operation:'wikimedia__get__metrics_pageviews_aggregate__projec_ad01043a8292',query:'pageviews_aggregate',args:{path:{project:'en.wikipedia.org',access:'all-access',agent:'user',granularity:'daily',start:'2025010100',end:'2025010100'}},check:d=>Array.isArray(d.data.items)&&d.data.items.length>0},
 {provider:'exchange-rates',operation:'exchange-rates__get__latest__base_currency_',query:'latest__base_currency',args:{path:{base_currency:'USD'}},check:d=>d.data.base==='USD'&&typeof d.data.rates?.EUR==='number'}
];
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'src/cli.js'),'serve'],cwd:root,stderr:'pipe'});
const client=new Client({name:'omni-public-verification',version:'1.0.0'});
const parse=r=>{if(r.isError)throw new Error(r.content?.[0]?.text||'MCP tool error');return JSON.parse(r.content[0].text)};
const results=[];
try {
 await client.connect(transport);
 const listed=await client.listTools();
 if(listed.tools.length!==4)throw new Error(`Expected four gateway tools, received ${listed.tools.length}`);
 const platforms=parse(await client.callTool({name:'platforms',arguments:{}}));
 for(const c of cases){
  const search=parse(await client.callTool({name:'search_operations',arguments:{query:c.query}}));
  if(!search.tools.some(t=>t.name===c.operation))throw new Error(`Bundled operation missing: ${c.operation}`);
  const description=parse(await client.callTool({name:'describe_operation',arguments:{name:c.operation}}));
  if(description.name!==c.operation)throw new Error(`Operation description mismatch: ${c.operation}`);
  const data=parse(await client.callTool({name:'call_operation',arguments:{name:c.operation,arguments:c.args}}));
  const passed=data.ok===true&&data.status===200&&c.check(data);
  results.push({provider:c.provider,operation:c.operation,status:data.status,passed,authenticated:false,scope:'One anonymous operation executed via the default-config MCP server; not whole-provider certification'});
  console.log(results.at(-1));
  if(!passed)throw new Error(`${c.provider} public check did not pass`);
 }
 await fs.writeFile(path.join(root,'docs/public-verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),defaultConfigPlatforms:platforms.map(p=>({id:p.id,enabled:p.enabled})),results},null,2)+'\n');
} finally {await client.close();}
