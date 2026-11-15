from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import csv, hashlib, json, re, shutil, sys

root = Path.cwd()
base = root / 'output/illustration-expansion'
notes = {n['card_id']:n for n in csv.DictReader((root/'cards.tsv').open(), delimiter='\t')}
scenarios = json.loads((root/'src/scenarioSources.json').read_text())
review_file = root/'src/illustrationReviews.json'
reviews = json.loads(review_file.read_text())
dry_run = '--dry-run' in sys.argv
module = root/'src/illustrations.ts'
text = module.read_text()
start = text.index(' = ')+3
sources, end = json.JSONDecoder().raw_decode(text[start:])
added, held = [], []
for manifest in sorted(base.rglob('manifest.json')):
    rows = json.loads(manifest.read_text())
    if not isinstance(rows,list):
        continue
    for row in rows:
        cid = row.get('card_id')
        if not cid or cid in sources:
            continue
        approved = row.get('reviewStatus') == 'approved'
        if not approved:
            held.append({'card_id':cid,'reason':row.get('reviewNote','Not visually approved')})
            continue
        note = notes.get(cid)
        if not note or note['ja'] != row['ja'] or note['en'] != row['en']:
            held.append({'card_id':cid,'reason':'Source wording changed'})
            continue
        if not re.fullmatch(r'expr_\d{4}',cid):
            raise ValueError('Unexpected asset identifier')
        image = manifest.parent/(cid+'.webp')
        if not image.exists():
            raise FileNotFoundError(image)
        context = scenarios.get(cid)
        review = row.get('reviewedContext', {})
        if (not context or any(context.get(k) != note[k] for k in ('ja','en','usage'))
            or row.get('usage') != note['usage']
            or review.get('context') != context
            or not review.get('reviewedAt') or not review.get('method')
            or review.get('imageSha256') != hashlib.sha256(image.read_bytes()).hexdigest()):
            held.append({'card_id':cid,'reason':'Exact image/context visual review required; see CONTEXT_REVIEW.md'})
            continue
        target = root/'public/illustrations'/(cid+'.webp')
        if target.exists():
            raise FileExistsError('Protecting existing unregistered image: '+str(target))
        if not dry_run:
            shutil.copyfile(image,target)
        reviews[cid] = review
        sources[cid] = {'ja':note['ja'],'en':note['en']}
        added.append({'card_id':cid,'ja':note['ja'],'en':note['en'],'manifest':str(manifest),'image':str(target),'sha256':hashlib.sha256(image.read_bytes()).hexdigest()})
if dry_run:
    print(json.dumps({'dryRun':True,'added':len(added),'registered':len(sources),'held':held},ensure_ascii=False))
    raise SystemExit(0)
module.write_text(text[:start]+json.dumps(sources,ensure_ascii=False,indent=2)+text[start+end:])
review_file.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n')
report = {'preparedAt':datetime.now(ZoneInfo('Asia/Tokyo')).isoformat(),'published':False,'registered':len(sources),'added':added,'held':held,'imageBytes':sum(p.stat().st_size for p in (root/'public/illustrations').glob('*.webp'))}
(base/'automation'/('publication-'+datetime.now(ZoneInfo('Asia/Tokyo')).date().isoformat()+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'added':len(added),'registered':len(sources),'held':len(held),'imageMB':round(report['imageBytes']/1000000,2)}))
