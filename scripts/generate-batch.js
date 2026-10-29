import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileSpec,packCompiled} from '../src/compiler.js';
import {normalizeSpec} from '../src/normalize.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const presets=JSON.parse(await fs.readFile(path.join(root,'presets.json'),'utf8'));
await fs.mkdir(path.join(root,'generated'),{recursive:true});
const report=[];
for(const p of presets) {
  // Download via fetch only from this maintainer-controlled, reviewed preset list.
  const response=await fetch(p.specUrl,{redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Spec HTTP ${response.status}: ${p.id}`);
  const bytes=await response.text();
  if(Buffer.byteLength(bytes)>32*1024*1024)throw new Error('Spec exceeds byte limit');
  const source=JSON.parse(bytes);
  const {doc,conversion}=await normalizeSpec(source);
  const c=compileSpec(doc,{id:p.id,baseUrl:p.baseUrl});
  await fs.writeFile(path.join(root,'generated',p.id+'.json'),JSON.stringify(packCompiled(c))+'\n');
  report.push({id:p.id,source:p.specUrl,catalogId:p.catalogId,specVersion:doc.info?.version,sourceFormat:source.swagger || source.openapi,conversion,categories:p.categories || [],pricingStatus:'unverified',enabledByDefault:false,sha256:createHash('sha256').update(bytes).digest('hex'),generated:c.tools.length,readMethods:c.tools.filter(t=>['GET','HEAD'].includes(t.method)).length,skipped:c.skipped.length,liveAuthenticatedTested:false});
  console.log(p.id,c.tools.length,'generated;',c.skipped.length,'skipped');
}
await fs.writeFile(path.join(root,'generated/report.json'),JSON.stringify({generatedAt:new Date().toISOString(),platforms:report},null,2)+'\n');
