import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpec} from '../src/normalize.js';
import {compileSpec} from '../src/compiler.js';
const swagger={swagger:'2.0',info:{title:'Swagger sample',version:'1'},host:'example.com',schemes:['https'],basePath:'/api',produces:['application/json'],securityDefinitions:{key:{type:'apiKey',in:'header',name:'X-API-Key'}},security:[{key:[]}],definitions:{Item:{type:'object',properties:{name:{type:'string'}}}},paths:{'/items/{id}':{get:{operationId:'getItem',parameters:[{in:'path',name:'id',required:true,type:'integer'}],responses:{200:{description:'OK',schema:{$ref:'#/definitions/Item'}}}}},'/items':{post:{operationId:'create',consumes:['application/json'],parameters:[{name:'body',in:'body',required:true,schema:{$ref:'#/definitions/Item'}}],responses:{200:{description:'OK'}}}}}};
test('Swagger 2 conversion preserves base path, security, parameters and body references',async()=>{
 const {doc,conversion}=await normalizeSpec(swagger);assert.equal(conversion,'swagger-2.0-to-openapi-3.0');
 const c=compileSpec(doc,{id:'converted'});assert.equal(c.tools.length,2);assert.equal(c.baseUrl,'https://example.com/api');assert.equal(c.tools[0].inputSchema.properties.path.properties.id.type,'integer');assert.deepEqual(c.tools[0].security,[{key:[]}]);assert.equal(c.tools[1].contentType,'application/json');
});
test('normalization refuses external file or URL refs before converter runs',async()=>{
 for(const ref of ['file:///etc/passwd','https://127.0.0.1/secret','../private.yaml'])await assert.rejects(normalizeSpec({...swagger,definitions:{Secret:{$ref:ref}}}),/External/);
});
test('normalization rejects deeply nested input',async()=>{
 let doc={};for(let i=0;i<160;i++)doc={child:doc};await assert.rejects(normalizeSpec(doc),/nesting/);
});
