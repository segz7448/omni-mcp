import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {connectUpstreams} from '../src/upstreams.js';
import {Engine} from '../src/engine.js';
test('explicit stdio upstream process: discovery, tool allowlist, call, validation and close',async t=>{
 const upstreams=await connectUpstreams([{id:'fixture',command:process.execPath,args:[path.resolve('test/fixtures/upstream.js')],allowTools:['echo']}]);
 t.after(()=>Promise.all(upstreams.map(u=>u.client.close())));
 const engine=new Engine([],upstreams);assert.equal(engine.list().total,1);
 assert.equal(engine.describe('local_fixture__echo').inputSchema.type,'object');
 const r=await engine.execute('local_fixture__echo',{value:'actual upstream stdio'});assert.equal(r.data.content[0].text,'actual upstream stdio');
 await assert.rejects(engine.execute('local_fixture__not_allowed',{}),/disabled/);
 await assert.rejects(engine.execute('local_fixture__echo',{value:5}),/schema/);
});
test('local upstreams fail closed without command and explicit tool allowlist',async()=>{
 await assert.rejects(connectUpstreams([{id:'x',command:process.execPath,allowTools:[]}]),/allowTools/);
 await assert.rejects(connectUpstreams([{id:'../x',command:process.execPath,allowTools:['echo']}]),/Invalid/);
});
