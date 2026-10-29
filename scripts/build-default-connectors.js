// Create the small, credential-free defaults from the reviewed generated specs.
// The specific operation targets must remain aligned with scripts/verify-public.js.
import fs from 'node:fs/promises';
import {packCompiled} from '../src/compiler.js';
const choices = [
  {id:'github', file:'github-public.json', match:t=>t.operationId==='repos/get'},
  {id:'wikimedia', file:'wikimedia-public.json', match:t=>t.path==='/metrics/pageviews/aggregate/{project}/{access}/{agent}/{granularity}/{start}/{end}'},
  {id:'exchange-rates', file:'exchange-rates-public.json', match:t=>t.path==='/latest/{base_currency}'},
];
for (const c of choices) {
  const input=JSON.parse(await fs.readFile(`generated/${c.id}.json`,'utf8'));
  const operation=input.tools.find(c.match);
  if (!operation || operation.method!=='GET' || operation.security?.length) throw new Error(`Missing anonymous GET: ${c.id}`);
  input.tools=[operation];
  input.skipped=[];
  await fs.writeFile(`defaults/${c.file}`,JSON.stringify(packCompiled(input))+'\n');
  console.log(`${c.id}: ${operation.name}`);
}
