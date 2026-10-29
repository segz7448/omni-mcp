import fs from 'node:fs/promises';
const raw=JSON.parse(await fs.readFile(process.argv[2] || 'catalog.json','utf8'));
const counts={};
for(const entry of raw.entries) for(const category of entry.categories) counts[category]=(counts[category] || 0)+1;
const report={source:raw.source,fetchedAt:raw.fetchedAt,apiEntries:raw.entries.length,categoryCounts:Object.fromEntries(Object.entries(counts).sort((a,b)=>b[1]-a[1])),verifiedFreeEntries:0,enabledByDefault:0,note:'Categories are source labels; one entry can have multiple categories. Pricing unverified, not a free integration count.'};
await fs.writeFile('docs/catalog-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
