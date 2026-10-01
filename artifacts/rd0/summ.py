import json, sys
d = sys.argv[1]
s = json.load(open(d + '/samples.json'))
log = json.load(open(d + '/log.json'))
print('==', d, 'frames', s['frames'], 'errors', len(s['errors']))
for e in s['events']:
    n = e['name']
    if n in ('tick', 'voice', 'sound', 'hunt-progress', 'sign-life', 'crossroad-text', 'chronicle'):
        continue
    print(json.dumps(e)[:330])
print('lastTick', log[-1]['tick'])
print('sign per tick:', {k: v for k, v in s['signSeen'].items() if k != 'boardFirst'})
print('boardFirst', s['signSeen'].get('boardFirst'))
print('tickTimes', [(e['t'], e['tick']) for e in s['events'] if e['name'] == 'tick'][:20])
for e in s['events']:
    if e['name'] in ('crossroad-text', 'chronicle'):
        print(e['name'], json.dumps(e)[:900])
