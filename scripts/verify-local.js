// Opt-in. Install reviewed reference packages separately before running this script.
// Usage: node scripts/verify-local.js /absolute/reference-package-prefix /absolute/node24
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {connectUpstreams} from '../src/upstreams.js';
import {Engine} from '../src/engine.js';
const prefix=process.argv[2],command=process.argv[3] || process.execPath;
if(!prefix)throw new Error('Supply installed package prefix; no auto install');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omni-reference-'));
let upstreams=[];
try {
 await fs.writeFile(path.join(dir,'hello.txt'),'omni reference server proof');
 process.env.MEMORY_FILE_PATH=path.join(dir,'memory.json');
 upstreams=await connectUpstreams([
  {id:'filesystem',command,args:[path.join(prefix,'node_modules/@modelcontextprotocol/server-filesystem/dist/index.js'),dir],allowTools:['read_text_file','list_directory','list_allowed_directories']},
  {id:'memory',command,args:[path.join(prefix,'node_modules/@modelcontextprotocol/server-memory/dist/index.js')],allowTools:['read_graph','search_nodes'],inheritEnv:['MEMORY_FILE_PATH']}
 ]);
 const engine=new Engine([],upstreams);
 const file=await engine.execute('local_filesystem__read_text_file',{path:path.join(dir,'hello.txt')});
 if(!JSON.stringify(file).includes('omni reference server proof'))throw new Error('File read proof failed');
 let denied=false;try{await engine.execute('local_filesystem__read_text_file',{path:'/etc/passwd'});}catch{denied=true;}
 // Some servers return isError rather than throw for denied requests.
 if(!denied){const r=await engine.execute('local_filesystem__read_text_file',{path:'/etc/passwd'});denied=!r.ok;}
 if(!denied)throw new Error('Directory boundary proof failed');
 const memory=await engine.execute('local_memory__read_graph',{});
 if(!memory.ok)throw new Error('Memory read proof failed');
 const packages={};for(const id of ['filesystem','memory'])packages[id]=JSON.parse(await fs.readFile(path.join(prefix,`node_modules/@modelcontextprotocol/server-${id}/package.json`),'utf8')).version;
 const report={checkedAt:new Date().toISOString(),nodeVersion:process.argv[3] ? '24 (external runtime)' : process.version,packages,results:[{id:'filesystem',passed:true,scope:'Allowlisted read of temporary fixture; outside directory denied; no writes enabled.'},{id:'memory',passed:true,scope:'Allowlisted empty temporary graph read; no persistent user data or mutation.'}],note:'Reference packages installed separately for opt-in verification, not gateway runtime dependencies. Node 24 required by these pinned releases.'};
 await fs.writeFile('docs/local-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally {await Promise.allSettled(upstreams.map(u=>u.client.close()));delete process.env.MEMORY_FILE_PATH;await fs.rm(dir,{recursive:true,force:true});}
