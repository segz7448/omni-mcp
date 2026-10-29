import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {compileSpec,packCompiled,unpackCompiled} from '../src/compiler.js';
import {Engine} from '../src/engine.js';
import {request,publicAddress} from '../src/http.js';
import {fixture} from './fixture.js';
async function setup(t, extra={}) {
 const received=[];const server=http.createServer(async(req,res)=>{let body='';for await(const b of req)body+=b;received.push({url:req.url,body,headers:req.headers});
 if(req.url==='/redirect'){res.writeHead(302,{location:'http://127.0.0.1:1/stolen'});return res.end('redirect');}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({url:req.url,body,authorization:req.headers.authorization}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const compiled=compileSpec(fixture(`http://127.0.0.1:${server.address().port}`),{id:'demo'});
 return {engine:new Engine([{compiled,allowLocalhost:true,...extra}]),compiled,received};
}
test('generator emits schemas, refs, annotations and compact roundtrip',()=>{
 const c=compileSpec(fixture(),{id:'demo'});assert.equal(c.tools.length,5);assert.equal(c.skipped.length,0);
 assert.equal(c.tools[0].inputSchema.properties.path.required[0],'id');assert.equal(c.tools.find(t=>t.operationId==='create').annotations.readOnlyHint,false);
 assert.deepEqual(JSON.parse(JSON.stringify(unpackCompiled(JSON.parse(JSON.stringify(packCompiled(c)))))),JSON.parse(JSON.stringify(c)));
});
test('reject Swagger 2, external refs, server variables and invalid IDs',()=>{
 assert.throws(()=>compileSpec({swagger:'2.0'},{id:'x'}));
 assert.throws(()=>compileSpec({...fixture(),servers:[{url:'https://{x}'}]},{id:'x'}));
 assert.throws(()=>compileSpec(fixture(),{id:'../escape'}));
 const doc=fixture();doc.paths['/external']={$ref:'https://bad.example/spec'};assert.throws(()=>compileSpec(doc,{id:'x'}));
});
test('skip unsupported parameter encodings with reasons',()=>{
 const doc=fixture();doc.paths['/bad']={get:{parameters:[{in:'query',name:'x',schema:{type:'object'}}]}};
 const c=compileSpec(doc,{id:'x'});assert.equal(c.skipped.length,1);assert.match(c.skipped[0].reason,/unsupported/);
});
test('GET path encoding, query arrays, schema validation',async t=>{
 const {engine,received}=await setup(t);const r=await engine.execute('demo__getItem',{path:{id:'a/b'},query:{tags:['one','two']}});
 assert.equal(r.status,200);assert.equal(received[0].url,'/items/a%2Fb?tags=one&tags=two');
 await assert.rejects(engine.execute('demo__getItem',{path:{id:2}}),/schema/);
 await assert.rejects(engine.execute('demo__getItem',{path:{id:'..'}}),/path/);
 assert.equal(received.length,1);
});
test('mutations disabled by default; exact allowlist permits JSON and form',async t=>{
 const {engine,received}=await setup(t,{allowWriteOperations:['demo__create','demo__form']});
 await engine.execute('demo__create',{body:{name:'test'}});assert.equal(received[0].body,'{"name":"test"}');
 await engine.execute('demo__form',{body:{name:'x y'}});assert.equal(received[1].body,'name=x+y');
 const {engine:locked}=await setup(t);await assert.rejects(locked.execute('demo__create',{body:{name:'no'}}),/disabled/);
});
test('auth resolved only from environment, redacted on response, fail closed',async t=>{
 process.env.OMNI_TEST_TOKEN='test-secret-value';t.after(()=>delete process.env.OMNI_TEST_TOKEN);
 const {engine,received}=await setup(t,{auth:{token:{env:'OMNI_TEST_TOKEN'}}});
 const r=await engine.execute('demo__secure',{});assert.equal(received[0].headers.authorization,'Bearer test-secret-value');assert.equal(r.data.authorization,'Bearer [REDACTED]');
 const {engine:noauth}=await setup(t);await assert.rejects(noauth.execute('demo__secure'),/credentials/);
});
test('no redirect following',async t=>{const {engine,received}=await setup(t);const r=await engine.execute('demo__redirect');assert.equal(r.status,302);assert.equal(received.length,1);});
test('SSRF policy blocks private destinations and plaintext',async()=>{
 for(const a of ['127.0.0.1','169.254.169.254','10.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(a),false);
 assert.equal(publicAddress('8.8.8.8'),true);
 await assert.rejects(request('http://example.com'),/HTTPS/);
 await assert.rejects(request('https://127.0.0.1'),/Private/);
 await assert.rejects(request('https://user:password@example.com'),/credentials/);
});
test('bounded discovery and lazy validation',async t=>{
 const {engine}=await setup(t);assert.equal(engine.list('',undefined,0,1).tools.length,1);assert.equal(engine.validators.size,0);
 assert.equal(engine.list('getItem').total,1);assert.throws(()=>engine.describe('missing'),/Unknown/);
});
test('unsupported regex dialect rejects rather than weakening validation',()=>{
 const doc=fixture();doc.paths['/bad']={get:{parameters:[{in:'query',name:'x',schema:{type:'string',pattern:'(?i)^test$'}}]}};
 const c=compileSpec(doc,{id:'x'});assert.equal(c.skipped.length,1);assert.match(c.skipped[0].reason,/regular-expression/);
});
