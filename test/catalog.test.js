import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
test('community discovery metadata deduped, source-bound and disabled by default',async()=>{
 const c=JSON.parse(await fs.readFile('catalog/community-candidates.json','utf8'));
 assert.equal(new Set(c.entries.map(e=>e.id)).size,c.entries.length);assert.equal(c.deduplicatedRepositories,c.entries.length);
 for(const e of c.entries){assert.equal(e.enabledByDefault,false);assert.equal(e.pricingStatus,'unverified');assert.equal(e.installStatus,'not_installed');assert.equal(e.verificationStatus,'unverified');assert.ok(e.sources.length);assert.match(e.repository,/^https:\/\/github.com\/[^/]+\/[^/]+$/);}
});
