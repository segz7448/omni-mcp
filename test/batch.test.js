import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {unpackCompiled} from '../src/compiler.js';
const presets=JSON.parse(await fs.readFile(new URL('../presets.json',import.meta.url)));
for(const preset of presets) test(`generated ${preset.id}: schemas compile and tool names are unique`,async t=>{
 let raw;try {raw=JSON.parse(await fs.readFile(new URL(`../generated/${preset.id}.json`,import.meta.url)));} catch {t.skip('Run npm run generate for network-dependent provider checks');return;}
 const c=unpackCompiled(raw);assert.ok(c.tools.length>0);assert.equal(new Set(c.tools.map(t=>t.name)).size,c.tools.length);
 const ajv=new Ajv({strict:false,unicodeRegExp:false,validateFormats:false});addFormats(ajv);
 for(const tool of c.tools) {assert.ok(tool.name.length<=64);try{ajv.compile(tool.inputSchema);}catch(e){assert.fail(tool.name+': '+e.message);}}
});
