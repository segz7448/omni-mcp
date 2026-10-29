#!/usr/bin/env python3
"""Build metadata only from previously downloaded public directory snapshots.
No discovered package is installed or executed by this script.
"""
import pathlib,re,json,html,hashlib,sys
from collections import Counter
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/omni-sweep')
entries={}; counts={}; excluded={'modelcontextprotocol/registry','chatmcp/mcp-directory','smithery-ai/smithery','modelcontextprotocol/specification','punkpeye/awesome-mcp-servers','modelcontextprotocol/modelcontextprotocol','modelcontextprotocol/docs'}
category_map={'brows':'pc_browser','file':'pc_files','bank':'banking','financ':'finance','payment':'payments','social':'social','database':'database','memory':'memory','communication':'messaging','developer':'developer_tools','productivity':'productivity','search':'search','cloud':'cloud'}
def category(label):
 s=label.lower()
 return next((v for k,v in category_map.items() if k in s),'other')
def add(repo,source,url,cat='other',package=None):
 repo=repo.rstrip('.').removesuffix('.git');key=repo.lower()
 if key in excluded or key.split('/')[0] in ['orgs','topics','sponsors','settings'] or key.endswith('/issues'):return
 if len(repo.split('/'))!=2:return
 e=entries.setdefault(key,dict(id=key,kind='community_server_candidate',repository='https://github.com/'+repo,categories=[],sources=[],packages=[],installStatus='not_installed',verificationStatus='unverified',pricingStatus='unverified',enabledByDefault=False))
 if cat not in e['categories']:e['categories'].append(cat)
 ref={'source':source,'url':url}
 if ref not in e['sources']:e['sources'].append(ref)
 if package and package not in e['packages']:e['packages'].append(package)
 counts.setdefault(source,set()).add(key)
status=json.loads((root/'status.json').read_text());source_urls={s['name']:s['url'] for s in status}
for source in ['official','awesome']:
 text=(root/(source+'.txt')).read_text();heading='other'
 for line in text.splitlines():
  if line.startswith('##'):heading=category(line)
  # Only list entries, not badges, navigation, stars or unrelated prose.
  if not re.match(r'^\s*[-*]\s+.*\[',line):continue
  links=re.findall(r'\[([^\]]+)\]\((https?://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)(?:[^)]*))\)',line)
  if not links:continue
  label,url,repo=links[0];add(repo,source,source_urls[source],heading)
  if source=='official' and 'servers-archived' in repo.lower():entries[repo.lower()]['maintenanceStatus']='archived_reference_not_recommended'
for source in ['smithery','glama','pulsemcp','mcp-so']:
 for file in root.glob(source+'-detail-*.txt'):
  url=file.with_suffix('.url').read_text();text=html.unescape(file.read_text())
  repos=re.findall(r'https?://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)',text)
  for repo in dict.fromkeys(repos):add(repo,source,url)
for obj in json.loads((root/'npm.txt').read_text()).get('objects',[]):
 p=obj['package'];repo=p.get('links',{}).get('repository','');m=re.search(r'github\.com[/:]([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)',repo)
 if m:add(m[1],'npm',p['links'].get('npm','https://www.npmjs.com/package/'+p['name']),category(' '.join(p.get('keywords',[]))),{'registry':'npm','name':p['name'],'version':p['version']})
for file in root.glob('pypi-*.json'):
 p=json.loads(file.read_text())['info'];url='https://pypi.org/project/'+p['name']+'/'
 for link in (p.get('project_urls') or {}).values():
  m=re.search(r'github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)',link)
  if m:add(m[1],'pypi',url,category(p['name']),{'registry':'pypi','name':p['name'],'version':p['version']})
# Specs are discovery metadata; do not upgrade candidates based on labels or directory scores.
result={'fetchedAt':'2026-10-29','method':'Public directory snapshots plus at most four detail pages per HTML directory, npm first 250 keyword results, four targeted PyPI records; not exhaustive.',
 'sourceCounts':{k:len(v) for k,v in counts.items()},'deduplicatedRepositories':len(entries),'categoryCounts':dict(Counter(c for e in entries.values() for c in e['categories'])),
 'limitations':['Community README entries are discovery candidates, not independently curated or audited connectors.','Dedupe by repository intentionally collapses monorepo subservers and does not identify forks.','HTML directories were sampled, not exhaustively crawled.','PyPI search returned a browser challenge; only four direct project JSON lookups were used.','Source listing text does not grant permission, verify free access or establish package safety.'],
 'sources':[dict(s,sha256=hashlib.sha256((root/(s['name']+'.txt')).read_bytes()).hexdigest()) for s in status if 'error' not in s],
 'entries':sorted(entries.values(),key=lambda e:e['id'])}
pathlib.Path('catalog/community-candidates.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
summary={k:v for k,v in result.items() if k not in ['entries','sources']};pathlib.Path('docs/community-report.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
