#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'yaml';
import {compileSpec, packCompiled, unpackCompiled} from './compiler.js';
import {Engine} from './engine.js';
import {serve} from './server.js';
import {request} from './http.js';
import {connectUpstreams} from './upstreams.js';
const args = process.argv.slice(2);
const option = (name, fallback) => { const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
async function readSpec(file) {
  const text = await fs.readFile(file,'utf8');
  if (Buffer.byteLength(text)>32*1024*1024) throw new Error('Spec exceeds 32 MiB');
  return parse(text,{maxAliasCount:50});
}
try {
  switch(args[0]) {
    case 'generate': {
      const spec = await readSpec(option('spec'));
      const c = compileSpec(spec,{id:option('id'),baseUrl:option('base-url')});
      const out = option('out');await fs.mkdir(path.dirname(out),{recursive:true});
      await fs.writeFile(out,JSON.stringify(packCompiled(c))+'\n');
      console.error(JSON.stringify({id:c.id,generated:c.tools.length,skipped:c.skipped.length,out}));break;
    }
    case 'serve': {
      const file = path.resolve(option('config','omni.config.json'));
      const config=JSON.parse(await fs.readFile(file,'utf8'));
      const platforms=[];
      for(const p of config.platforms || []) {
        const compiled=unpackCompiled(JSON.parse(await fs.readFile(path.resolve(path.dirname(file),p.compiled),'utf8')));
        if(p.baseUrl) compiled.baseUrl=p.baseUrl;
        platforms.push({...p,compiled});
      }
      const upstreams=await connectUpstreams(config.upstreams || []);
      const close=async()=>{await Promise.allSettled(upstreams.map(u=>u.client.close()));process.exit(0);};
      process.once('SIGINT',close);process.once('SIGTERM',close);process.stdin.once('end',close);
      await serve(new Engine(platforms,upstreams));break;
    }
    case 'catalog-sync': {
      const url='https://api.apis.guru/v2/list.json';
      const r=await request(url,{maxBytes:32*1024*1024});if(r.status!==200)throw new Error(`Catalog HTTP ${r.status}`);
      const raw=JSON.parse(r.text);
      const entries=Object.entries(raw).map(([id,v])=>({id,title:v.versions[v.preferred].info.title,specUrl:v.versions[v.preferred].swaggerUrl,version:v.preferred,categories:(()=>{const c=v.versions[v.preferred].info['x-apisguru-categories'];return Array.isArray(c)?c:(typeof c==='string'?[c]:['uncategorized']);})(),pricingStatus:'unverified',enabledByDefault:false}));
      const out=option('out','catalog.json');await fs.writeFile(out,JSON.stringify({source:url,fetchedAt:new Date().toISOString(),entries},null,2)+'\n');console.error(`${entries.length} catalog entries saved to ${out}; not verified integrations`);break;
    }
    default: console.error('omni-mcp generate --spec FILE --id ID --out FILE [--base-url URL]\nomni-mcp serve --config FILE\nomni-mcp catalog-sync [--out FILE]'); if(args[0])process.exitCode=1;
  }
} catch(e) {console.error(e.message);process.exitCode=1;}
