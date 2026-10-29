import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
test('CLI compiles YAML to a compact manifest with schema provenance',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omni-cli-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'api.yaml'),'openapi: 3.0.3\ninfo: {title: Example, version: "1"}\nservers: [{url: "https://example.com"}]\npaths:\n  /health:\n    get:\n      operationId: health\n      responses: {}\n');
 await exec(process.execPath,[path.resolve('src/cli.js'),'generate','--spec',path.join(dir,'api.yaml'),'--id','example','--out',path.join(dir,'out.json')]);
 const c=JSON.parse(await fs.readFile(path.join(dir,'out.json')));assert.equal(c.tools[0].name,'example__health');assert.equal(c.baseUrl,'https://example.com');
});
