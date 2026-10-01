import json, sys
d = json.load(open(sys.argv[1] + '/log.json'))
a = d[len(d) // 3]
b = d[-1]
dt = b['t'] - a['t']
print(sys.argv[1], 'fps %.2f' % ((b['frames'] - a['frames']) / dt), 'maxGap', b['maxGap'], 'samples', len(d), 'slow>50ms', b['slow'])
